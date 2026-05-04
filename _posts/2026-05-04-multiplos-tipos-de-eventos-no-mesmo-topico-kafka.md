---
layout: post
title: "Múltiplos Tipos de Eventos no Mesmo Tópico Kafka — Do Jeito Certo"
date: 2026-05-04 09:00 -0600
categories: [Data Streaming, Apache Kafka]
tags: [Kafka, Confluent, Schema Registry, JSON Schema, Python, Event Streaming]
excerpt: "Cansado de criar um tópico por tipo de evento? Aprenda como usar o TopicRecordNameStrategy com JSON Schema para publicar múltiplos tipos de evento em um único tópico Kafka no Confluent Cloud."
lang: pt-BR
ref: multi-schema-topic-kafka
---

# Introdução

Uma das questões de design mais debatidas no Kafka é: **cada tipo de evento deve ter seu próprio tópico, ou múltiplos tipos podem compartilhar um único tópico?**

O instinto é seguir com um tópico por tipo — é simples, previsível e evita que os consumers precisem lidar com schemas diferentes. Mas na prática, essa abordagem pode rapidamente virar uma explosão de tópicos. Imagine um domínio de `orders` com eventos de `OrderStatus`, `OrderPayment` e `OrderShipment` — todos relacionados, frequentemente consumidos juntos, mas vivendo em três tópicos separados só para manter os schemas limpos.

Existe um jeito melhor. Neste post, vou mostrar como construí um demo que demonstra exatamente como fazer isso de forma correta usando **Confluent Cloud**, **JSON Schema** e o **TopicRecordNameStrategy**.

👉 [**Veja o demo completo no GitHub →**](https://github.com/wleite/Demo-Multi-Schema-Topic)

## 1️. O Problema com Múltiplos Tipos de Eventos

Sem uma estratégia, misturar tipos de eventos em um único tópico Kafka é uma receita para o caos. Os consumers não sabem qual schema usar, os producers podem sobrescrever as definições de schema uns dos outros, e a evolução dos schemas vira um pesadelo.

É exatamente aqui que o **Schema Registry da Confluent** e as estratégias de nomenclatura de subjects brilham. A peça-chave é o **TopicRecordNameStrategy**, que registra cada tipo de evento sob seu próprio subject, em vez de compartilhar um único subject para o tópico inteiro:

```
Subject = <tópico>-<nome_do_registro>-value
```

Então, para um tópico chamado `orders-multi-schema`, você obtém:

| Tipo de Evento  | Nome do Subject                           |
|-----------------|-------------------------------------------|
| OrderStatus     | `orders-multi-schema-OrderStatus-value`   |
| OrderPayment    | `orders-multi-schema-OrderPayment-value`  |
| OrderShipment   | `orders-multi-schema-OrderShipment-value` |

Cada schema evolui de forma independente. Você pode adicionar um campo ao `OrderPayment` sem tocar no `OrderStatus`. Pode versionar cada um no seu próprio ritmo. Sem acoplamento, sem caos.

## 2️. O Que o Demo Cobre

O demo simula um tópico `orders` do mundo real carregando três tipos distintos de eventos, cada um com seu próprio JSON Schema:

- 🟢 **OrderStatus** — Rastreia o ciclo de vida do pedido: `PENDING → CONFIRMED → PROCESSING → COMPLETED`
- 🔵 **OrderPayment** — Registra transações de pagamento com método, valor, moeda e status
- 🟠 **OrderShipment** — Acompanha o progresso do envio desde a criação da etiqueta até a entrega

Um **producer** em Python serializa os três tipos e os publica no mesmo tópico. Um **consumer** em Python desserializa cada mensagem, resolvendo automaticamente o schema correto no registry — sem lógica condicional necessária no lado do consumer.

## 3️. A Arquitetura

O fluxo é mais limpo do que você pode imaginar:

```
Producer (Python)
  ├── OrderStatus    → registra schema → orders-multi-schema-OrderStatus-value
  ├── OrderPayment   → registra schema → orders-multi-schema-OrderPayment-value
  └── OrderShipment  → registra schema → orders-multi-schema-OrderShipment-value
         ↓                                       ↑
   Tópico Kafka: orders-multi-schema        Schema Registry
         ↓                                       ↑
Consumer (Python)
  └── JSONDeserializer resolve o schema automaticamente por mensagem
```

O producer usa o `JSONSerializer` da Confluent com `subject_name_strategy=topic_record_name_strategy`. Essa única mudança de configuração é o que faz tudo funcionar — o serializer sabe que deve registrar e buscar schemas pelo nome do registro, não apenas pelo tópico.

## 4️. Como Executar

A configuração roda no **free tier do Confluent Cloud** e usa **Python + uv** para gerenciamento de dependências. Depois de configurar as credenciais em um arquivo `.env`:

```bash
# Terminal 1 — Executar o producer
cd src && python producer.py

# Terminal 2 — Executar o consumer
cd src && python consumer.py
```

Dica do próprio repositório: divida o terminal verticalmente para acompanhar os eventos fluindo do producer para o consumer em tempo real. É curiosamente satisfatório.

O producer emite 15 mensagens (5 por tipo de evento), e o consumer exibe cada uma com um card colorido mostrando os campos, partição e offset. Uma saída limpa que facilita verificar que tudo está funcionando corretamente.

## 5️. Por Que Este Padrão Importa

Além do demo, esse padrão tem um valor arquitetural real:

✅ **Menos tópicos, menos overhead operacional** — gerenciar 1 tópico é mais simples do que gerenciar 10.

✅ **Eventos relacionados no mesmo lugar** — eventos de status, pagamento e envio do mesmo pedido podem cair na mesma partição, facilitando muito joins e correlações.

✅ **Evolução de schema independente** — cada tipo de evento versiona no seu próprio ritmo, sem coordenação necessária.

✅ **Flexibilidade para consumers** — um consumer que só se importa com pagamentos pode filtrar por tipo de registro; um que precisa do quadro completo lê tudo.

## Conclusão

Vamos ser honestos sobre algo primeiro: **um tópico por tipo de evento ainda é o modelo com melhor governança.** À medida que sua plataforma de data streaming amadurece, evoluir seus tópicos em direção a **Data Products** — streams de eventos bem definidos, com ownership claro e contratos explícitos — é o caminho certo. Isso significa um schema, um responsável e um contrato claro por tópico. Essa abordagem torna descoberta, linhagem e governança de schemas muito mais fáceis de manter em escala.

Dito isso, o mundo real nem sempre coopera. Sistemas legados, restrições de equipe, pressão de custo ou simplesmente a natureza de um domínio fortemente acoplado podem tornar o ideal de um tópico por tipo impraticável. Nessas situações, a resposta não deveria ser "esqueça a governança e torça para dar certo." A resposta é exatamente o que este demo mostra: você pode ter múltiplos tipos de eventos em um único tópico **e ainda manter governança completa de schema** através do Schema Registry e do TopicRecordNameStrategy.

Então pense nesse padrão não como o destino, mas como uma ferramenta pragmática para a jornada — uma forma de manter estrutura e controle mesmo quando sua topologia não corresponde ao ideal.

🚀 [**Acesse o demo no GitHub**](https://github.com/wleite/Demo-Multi-Schema-Topic) e experimente — o free tier é tudo que você precisa.

---

**Alimentado por inteligência artificial, curado por mentes humanas.**  
*Claude Sonnet, desenvolvido pela Anthropic.* 🚀
