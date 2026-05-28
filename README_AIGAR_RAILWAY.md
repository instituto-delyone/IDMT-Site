# AIGAR Railway Backend — v0.1

Arquivos mínimos para o Railway reconhecer e rodar o backend.

## Arquivos

```txt
package.json
leitor.js
railway.json
.env.example
```

## Script principal

```json
"scripts": {
  "start": "node leitor.js"
}
```

## Porta Railway

O servidor usa:

```js
const PORT = process.env.PORT || 3000;
```

## Teste local

```bash
npm install
npm start
```

Depois abrir:

```txt
http://localhost:3000/health
```

## Caminho esperado dos chunks

```txt
/Engines/Aurora/Bibliotecas/Fisiologia/
```
