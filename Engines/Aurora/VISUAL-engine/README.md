# VISUAL Engine — Aurora / IDMT

Módulo visual reutilizável para o site inteiro.

## Arquivos

- `visual-engine.css`
- `visual-engine.js`

## Como ativar em qualquer HTML

Adicionar no `<head>`:

```html
<link rel="stylesheet" href="/Engines/Aurora/VISUAL-engine/visual-engine.css">
```

Adicionar antes do `</body>`:

```html
<script src="/Engines/Aurora/VISUAL-engine/visual-engine.js"></script>
```

## Como aplicar efeito de portal em links

```html
<a class="portal-zoom-link" href="/Comercial/">Comercial</a>
```

ou:

```html
<a data-ve="portal" href="/Flagship/">Flagship</a>
```

## Funções atuais

- fade-in suave em cards;
- hover mais elegante;
- overlay de transição;
- portal zoom antes de trocar de página;
- respeito a `prefers-reduced-motion`.

## Próximos passos

- engine visual por rotas;
- mapas de timeline;
- animações axonais;
- transições específicas para Diagnosis;
- tema visual por engine.
