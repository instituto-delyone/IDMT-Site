# Time Engine Policy — v0.1

O Time Engine é o relógio contextual do sistema.

Ele não serve apenas para marcar hora.
Ele regula:

- idade dos arquivos;
- validade contextual;
- prioridade de cache;
- limpeza futura;
- arquivamento;
- reindexação;
- consolidação de memória.

## Estados temporais

### active
Arquivos recentes, usados com frequência ou centrais para o ciclo atual.

### warm
Arquivos ainda importantes, mas fora do foco imediato.

### cold
Arquivos de arquivo/memória longa. Devem ser preservados, mas não carregados por padrão.

### expired
Arquivos candidatos a compressão, revisão ou limpeza.

## Regra ética

Nenhum arquivo importante deve ser apagado automaticamente sem confirmação humana.

O primeiro uso do Clock é organizar, não destruir.
