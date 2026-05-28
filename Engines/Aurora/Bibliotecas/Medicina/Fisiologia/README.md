# Biblioteca Fisiologia — chunks por partes v0.1

Esta pasta foi preparada para funcionar dentro do ecossistema Aurora/AIGAR.

## Regra desta versão

Todos os arquivos ficam diretamente dentro da pasta:

```txt
/Engines/Aurora/Bibliotecas/Fisiologia/
```

Sem subpasta intermediária.

## Arquivos principais

```txt
index.json
topics.yaml
README.md
parte_01_chunk_0001.md
parte_01_chunk_0002.md
...
```

## PDFs

Coloque os PDFs originais nesta mesma pasta.

Sugestão de nomes sem acento/espaço para GitHub:

```txt
tratado_de_fisiologia_medica_guyton_13_ed.pdf
tratado_de_fisiologia_medica_guyton_13_ed-pt2.pdf
tratado_de_fisiologia_medica_guyton_13_ed-pt3.pdf
tratado_de_fisiologia_medica_guyton_13_ed-pt4.pdf
tratado_de_fisiologia_medica_guyton_13_ed-final.pdf
```

## Como o AIGAR deve usar

```txt
pergunta do usuário
→ CSI identifica intenção/tema
→ index.json localiza chunks candidatos
→ chunk aponta páginas do PDF
→ AIGAR carrega o trecho relevante
→ resposta clínica/estrutural
```

## Observação

Os chunks são ponte de indexação.
Eles não são resumo completo e não substituem o livro.
