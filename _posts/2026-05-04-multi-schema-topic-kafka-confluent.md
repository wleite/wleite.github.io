---
layout: post
title: "Multiple Event Types on a Single Kafka Topic — The Right Way"
date: 2026-05-04 09:00 -0600
categories: [Data Streaming, Apache Kafka]
tags: [Kafka, Confluent, Schema Registry, JSON Schema, Python, Event Streaming]
excerpt: "One topic per schema is the governance ideal — but the real world doesn't always cooperate. Learn how to use TopicRecordNameStrategy and JSON Schema to keep full schema governance even when multiple event types share a single Kafka topic."
ref: multi-schema-topic-kafka
---

# Introduction

If you're thinking about how to design topics in Kafka, the answer from a governance perspective is clear: **one topic per event type**. Each topic carries a single schema, has a clear owner, and evolves on its own contract. As your platform matures, this is the path toward **Data Products** — well-defined, independently owned event streams that other teams can discover and consume with confidence. That's the direction you should be heading.

But the real world doesn't always let you start there. Legacy systems, domain boundaries, team constraints, or a migration in progress can leave you in a situation where multiple event types end up on the same topic. And when that happens, the wrong answer is to give up on governance entirely and hope consumers figure it out at runtime.

In this post, I'll walk through a demo I built that shows exactly how to handle that situation — using **Confluent Cloud**, **JSON Schema**, and the **TopicRecordNameStrategy** to keep full schema enforcement even when multiple event types share a single topic.

👉 [**Check out the full demo on GitHub →**](https://github.com/wleite/Demo-Multi-Schema-Topic)

👉 [**Check out the full demo on GitHub →**](https://github.com/wleite/Demo-Multi-Schema-Topic)

## 1️. The Problem with Multiple Event Types

Without a strategy, mixing event types in a single Kafka topic is a recipe for chaos. Consumers can't tell what schema to use, producers can accidentally overwrite each other's schema definitions, and schema evolution becomes a nightmare.

This is exactly where **Confluent's Schema Registry** and subject naming strategies shine. The key piece here is the **TopicRecordNameStrategy**, which registers each event type under its own subject instead of sharing a single subject for the whole topic:

```text
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

```text
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
