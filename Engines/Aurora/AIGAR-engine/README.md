# AIGAR Engine — v0.1 portal integration

Estrutura inicial do portal AIGER conectado à AIGAR-engine.

## Rotas

```txt
/Aiger/
  index.html

/Engines/Aurora/AIGAR-engine/
  aigar-core.js
  aigar-style.css
  MC_BASE_AIGAR_v1.1.yaml
  MC_PRINCIPIOS_AURORA.yaml
  raciocinio_rapido_hibrido.txt
  CHECKSUMS.txt
  MC-PROJETO-AIGAR-INFRA-2025-09.pdf
  README.md
```

## Link no Diagnosis

```html
<a href="/Aiger/">Abrir projeto</a>
```

## Função atual

A engine é local e defensiva. Ela lê arquivos do núcleo v1.1 quando disponíveis e responde por modos:
- clínico;
- documental;
- engenharia;
- geral.

## Próximos passos

- conectar biblioteca médica;
- adicionar JSON/YAML de casos clínicos;
- integrar CSI-engine como pré-processador linguístico;
- criar cache local de documentos;
- evoluir para backend/API quando necessário.
