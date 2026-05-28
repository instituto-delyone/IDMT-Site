# Library Router Engine — v0.1

O Library-router é a ponte entre o CSI e as bibliotecas.

## Função

```txt
pergunta
→ CSI interpreta domínio e significado
→ Library-router procura biblioteca adequada
→ retorna chunks candidatos
→ AIGAR usa os apontadores para raciocinar
```

## Estrutura

```txt
/Engines/Aurora/Library-router/
  library-router.js
  router-map.json
  router-policy.yaml
  README.md
  integration-snippet.html
```

## Integração no /Aiger/index.html

A ordem ideal dos scripts é:

```html
<script src="/Engines/Aurora/CSI-engine/csi-core.js"></script>
<script src="/Engines/Aurora/Library-router/library-router.js"></script>
<script src="/Engines/Aurora/AIGAR-engine/aigar-core.js"></script>
```

Depois:

```html
<script>
document.addEventListener("DOMContentLoaded", async () => {
  if (window.CSIEngine) await CSIEngine.init();
  if (window.LibraryRouter) await LibraryRouter.init();
});
</script>
```

## Uso no console

```js
await CSIEngine.init()
await LibraryRouter.init()

const packet = CSIEngine.prepareForAIGAR("explique insulina e glucagon")
const route = LibraryRouter.routeFromCSIPacket(packet)

console.log(LibraryRouter.explainRoute(route))
```

## Observação

O router ainda não lê o PDF inteiro sozinho.
Ele encontra os chunks candidatos e aponta:

```txt
PDF correto
parte correta
páginas corretas
palavras-chave
```

A etapa seguinte é integrar isso no AIGAR para ele responder exibindo de onde veio a rota.
