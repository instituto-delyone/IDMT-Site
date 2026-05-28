# CSI Engine — v0.1

CSI Engine transforma o `csi.json` em uma camada operacional.

## Função

```txt
entrada humana
→ normalização
→ classificação semântica
→ busca de conceitos CSI
→ sugestão de rota
→ pacote para AIGAR
```

## Estrutura

```txt
/Engines/Aurora/CSI-engine/
  csi.json
  csi-core.js
  csi-patterns.json
  csi-policy.yaml
  README.md
  integration-snippet.html
```

## Como integrar no /Aiger/index.html

Coloque antes do `aigar-core.js`:

```html
<script src="/Engines/Aurora/CSI-engine/csi-core.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", async () => {
    await CSIEngine.init();
  });
</script>
```

## Como usar no console

```js
await CSIEngine.init()
CSIEngine.classify("paciente com dispneia e dor torácica")
CSIEngine.prepareForAIGAR("explique insulina e glucagon")
CSIEngine.explain("como limpar cache antigo?")
```

## Próximo passo

Atualizar o `aigar-core.js` para chamar:

```js
const packet = CSIEngine.prepareForAIGAR(text)
```

antes de responder.
