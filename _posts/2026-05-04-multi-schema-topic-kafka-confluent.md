---
layout: post
title: "Multiple Event Types on a Single Kafka Topic — The Right Way"
date: 2026-05-04 09:00 -0600
categories: [Data Streaming, Apache Kafka]
tags: [Kafka, Confluent, Schema Registry, JSON Schema, Python, Event Streaming]
excerpt: "Tired of creating one topic per event type? Learn how to use TopicRecordNameStrategy and JSON Schema to safely publish multiple event types on a single Kafka topic in Confluent Cloud."
ref: multi-schema-topic-kafka
---

# Introduction

One of the most debated design questions in Kafka is: **should each event type get its own topic, or can multiple event types share one?**

The instinct is to go one topic per type — it's simple, predictable, and keeps consumers from having to deal with different schemas. But in the real world, that approach can quickly spiral into a topic explosion. Imagine an `orders` domain where you have `OrderStatus`, `OrderPayment`, and `OrderShipment` events — each closely related, often consumed together, but living on three separate topics just to keep schemas clean.

There's a better way. In this post, I'll walk through how I built a demo that shows exactly how to do this properly using **Confluent Cloud**, **JSON Schema**, and the **TopicRecordNameStrategy**.

👉 [**Check out the full demo on GitHub →**](https://github.com/wleite/Demo-Multi-Schema-Topic)

## 1️. The Problem with Multiple Event Types

Without a strategy, mixing event types in a single Kafka topic is a recipe for chaos. Consumers can't tell what schema to use, producers can accidentally overwrite each other's schema definitions, and schema evolution becomes a nightmare.

This is exactly where **Confluent's Schema Registry** and subject naming strategies shine. The key piece here is the **TopicRecordNameStrategy**, which registers each event type under its own subject instead of sharing a single subject for the whole topic:

```
Subject = <topic>-<record_name>-value
```

So for a topic called `orders-multi-schema`, you get:

| Event Type     | Subject Name                              |
|----------------|-------------------------------------------|
| OrderStatus    | `orders-multi-schema-OrderStatus-value`   |
| OrderPayment   | `orders-multi-schema-OrderPayment-value`  |
| OrderShipment  | `orders-multi-schema-OrderShipment-value` |

Each schema evolves independently. You can add a field to `OrderPayment` without touching `OrderStatus`. You can version them separately. No coupling, no chaos.

## 2️. What the Demo Covers

The demo simulates a real-world `orders` topic carrying three distinct event types, each with its own JSON Schema:

- 🟢 **OrderStatus** — Tracks the order lifecycle: `PENDING → CONFIRMED → PROCESSING → COMPLETED`
- 🔵 **OrderPayment** — Records payment transactions with method, amount, currency, and status
- 🟠 **OrderShipment** — Tracks shipping progress from label creation to delivery

A Python **producer** serializes all three types and publishes them to the same topic. A Python **consumer** deserializes each message, auto-resolving the correct schema from the registry — no conditional logic needed on the consumer side.

## 3️. The Architecture

The flow is cleaner than you might expect:

```
Producer (Python)
  ├── OrderStatus    → registers schema → orders-multi-schema-OrderStatus-value
  ├── OrderPayment   → registers schema → orders-multi-schema-OrderPayment-value
  └── OrderShipment  → registers schema → orders-multi-schema-OrderShipment-value
         ↓                                       ↑
   Kafka Topic: orders-multi-schema         Schema Registry
         ↓                                       ↑
Consumer (Python)
  └── JSONDeserializer auto-resolves schema per message
```

The producer uses Confluent's `JSONSerializer` with `subject_name_strategy=topic_record_name_strategy`. That single configuration change is what makes the whole thing work — the serializer knows to register and look up schemas by record name, not by topic alone.

## 4️. Running It

The setup runs on **Confluent Cloud's free tier** and uses **Python + uv** for dependency management. Once you have your credentials configured in a `.env` file:

```bash
# Terminal 1 — Run the producer
cd src && python producer.py

# Terminal 2 — Run the consumer
cd src && python consumer.py
```

Pro tip from the repo: split your terminal vertically to watch events flowing from producer to consumer in real time. It's oddly satisfying.

The producer emits 15 messages (5 per event type), and the consumer renders each one with a colored card showing field values, partition, and offset. Clean output that makes it easy to verify everything is wired up correctly.

## 5️. Why This Pattern Matters

Beyond the demo, this pattern has real architectural value:

✅ **Fewer topics, less operational overhead** — managing 1 topic is simpler than managing 10.

✅ **Co-located related events** — order status, payment, and shipment events for the same order can land in the same partition, making joins and correlation much easier.

✅ **Independent schema evolution** — each event type versions on its own timeline, no coordination needed.

✅ **Consumer flexibility** — a consumer that cares only about payments can filter by record type; one that needs the full picture reads everything.

## Conclusion

Let's be honest about something first: **one topic per event type is still the better governance model.** As your data streaming platform matures, evolving your topics toward **Data Products** — well-defined, independently owned, contract-driven event streams — is the right direction. That means one schema, one owner, one clear contract per topic. It makes discovery, lineage, and schema governance dramatically easier at scale.

That said, the real world doesn't always cooperate. Legacy systems, team constraints, cost pressure, or simply the nature of a tightly coupled domain can make the one-topic-per-type ideal impractical. In those situations, the answer shouldn't be "throw governance out the window and hope for the best." The answer is exactly what this demo shows: you can have multiple event types in a single topic **and still keep full schema governance** through the Schema Registry and TopicRecordNameStrategy.

So think of this pattern not as the destination, but as a pragmatic tool for the journey — a way to maintain structure and enforcement even when your topology doesn't match the ideal.

🚀 [**Grab the demo on GitHub**](https://github.com/wleite/Demo-Multi-Schema-Topic) and give it a spin — the free tier is all you need.

---

**Fueled by artificial intelligence, curated for human minds.**  
*Claude Sonnet, developed by Anthropic.* 🚀
