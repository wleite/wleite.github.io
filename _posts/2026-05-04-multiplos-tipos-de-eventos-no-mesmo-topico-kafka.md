---
layout: post
title: "Múltiplos Tipos de Eventos no Mesmo Tópico Kafka — Do Jeito Certo"
date: 2026-05-04 09:00 -0600
categories: [Data Streaming, Apache Kafka]
tags: [Kafka, Confluent, Schema Registry, JSON Schema, Python, Event Streaming]
excerpt: "Um tópico por schema é o ideal de governança — mas o mundo real nem sempre coopera. Aprenda como usar o TopicRecordNameStrategy com JSON Schema para manter governança completa mesmo quando múltiplos tipos de eventos compartilham um único tópico Kafka."
lang: pt-BR
ref: multi-schema-topic-kafka
---

# Introdução

Se você está pensando em como estruturar tópicos no Kafka, a resposta do ponto de vista de governança é clara: **um tópico por tipo de evento**. Cada tópico carrega um único schema, tem um responsável definido e evolui com seu próprio contrato. À medida que sua plataforma amadurece, esse é o caminho em direção aos **Data Products** — streams de eventos bem definidos, com ownership claro, que outras equipes podem descobrir e consumir com confiança. É para lá que você deveria estar indo.

Mas o mundo real nem sempre permite começar por aí. Sistemas legados, fronteiras de domínio, restrições de equipe ou uma migração em andamento podem te deixar numa situação onde múltiplos tipos de eventos acabam no mesmo tópico. E quando isso acontece, a resposta errada é abrir mão da governança e torcer para que os consumers resolvam tudo em tempo de execução.

Neste post, vou mostrar um demo que construí para demonstrar exatamente como lidar com essa situação — usando **Confluent Cloud**, **JSON Schema** e o **TopicRecordNameStrategy** para manter a validação completa de schema mesmo quando múltiplos tipos de eventos compartilham um único tópico.

👉 [**Veja o demo completo no GitHub →**](https://github.com/wleite/Demo-Multi-Schema-Topic)

👉 [**Veja o demo completo no GitHub →**](https://github.com/wleite/Demo-Multi-Schema-Topic)

## 1️. O Problema com Múltiplos Tipos de Eventos

Sem uma estratégia, misturar tipos de eventos em um único tópico Kafka é uma receita para o caos. Os consumers não sabem qual schema usar, os producers podem sobrescrever as definições de schema uns dos outros, e a evolução dos schemas vira um pesadelo.

É exatamente aqui que o **Schema Registry da Confluent** e as estratégias de nomenclatura de subjects brilham. A peça-chave é o **TopicRecordNameStrategy**, que registra cada tipo de evento sob seu próprio subject, em vez de compartilhar um único subject para o tópico inteiro:

```text
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

```text
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
