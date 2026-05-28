# Clock / Time Engine — v0.1

Esta pasta inaugura o módulo temporal do ecossistema Aurora/AIGAR.

## Ideia central

O Clock não é apenas um relógio.

Ele é uma camada de regulação temporal para que o sistema consiga entender:

- quando algo foi criado;
- quando foi usado;
- se ainda está ativo;
- se deve ficar em cache;
- se deve ser arquivado;
- se deve ser limpo;
- se deve ser reindexado.

## Estrutura

```txt
/Time/
  time-core.json
  time-policy.md
  time-cleanup.yaml

/Engines/Aurora/Time-engine/
  time-engine.js
  README.md
```

## Integração futura

O Time Engine poderá conversar com:

```txt
AIGAR-engine      → decide o que raciocinar
CSI-engine        → interpreta pedidos temporais
VISUAL-engine     → anima transições e estados
Bibliotecas       → organiza livros, chunks e índices
Aiger portal      → mostra estado do raciocínio
```

## Regra de segurança

Por padrão, o Time Engine não apaga arquivos importantes sozinho.

Ele apenas classifica:

```txt
active → warm → cold → expired
```

A limpeza real deve pedir confirmação.
