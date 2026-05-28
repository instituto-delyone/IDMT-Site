const fs = require("fs");
const path = require("path");

const pastaFisiologia = path.join(
  __dirname,
  "..",
  "Engines",
  "Aurora",
  "Bibliotecas",
  "Fisiologia"
);

const arquivos = fs
  .readdirSync(pastaFisiologia)
  .filter((arquivo) => arquivo.endsWith(".md"));

console.log("Arquivos encontrados:", arquivos.length);

const primeiroChunk = arquivos[0];

if (!primeiroChunk) {
  console.log("Nenhum chunk .md encontrado.");
  process.exit(0);
}

const caminho = path.join(pastaFisiologia, primeiroChunk);
const conteudo = fs.readFileSync(caminho, "utf-8");

console.log("Lendo:", primeiroChunk);
console.log("------ INÍCIO DO CHUNK ------");
console.log(conteudo.slice(0, 2000));
console.log("------ FIM DO CHUNK ------");
