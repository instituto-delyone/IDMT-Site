const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

const ROOT = __dirname;

const BIBLIOTECA_FISIOLOGIA = path.join(
  ROOT,
  "Engines",
  "Aurora",
  "Bibliotecas",
  "Medicina",
  "Fisiologia"
);

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizar(texto) {
  const stopwords = new Set([
    "que", "qual", "quais", "como", "onde", "quando", "porque",
    "por", "para", "com", "sem", "uma", "umas", "uns", "dos",
    "das", "de", "do", "da", "em", "no", "na", "nos", "nas",
    "o", "a", "os", "as", "e", "ou", "um", "me", "voce", "você",
    "sobre", "explique", "defina", "diga", "fale"
  ]);

  return normalizar(texto)
    .split(" ")
    .filter(token => token.length > 2 && !stopwords.has(token));
}

function listarChunks() {
  if (!fs.existsSync(BIBLIOTECA_FISIOLOGIA)) return [];

  return fs.readdirSync(BIBLIOTECA_FISIOLOGIA)
    .filter(nome => nome.endsWith(".md") || nome.endsWith(".txt"))
    .map(nome => path.join(BIBLIOTECA_FISIOLOGIA, nome));
}

function pontuarChunk(tokens, conteudo) {
  const texto = normalizar(conteudo);
  let score = 0;

  for (const token of tokens) {
    if (texto.includes(token)) score += 1;
  }

  return score;
}

function buscarNaBiblioteca(pergunta, limite = 3) {
  const arquivos = listarChunks();
  const tokens = tokenizar(pergunta);

  if (!arquivos.length) {
    return {
      encontrado: false,
      motivo: "Nenhum chunk .md/.txt encontrado em Engines/Aurora/Bibliotecas/Fisiologia.",
      candidatos: []
    };
  }

  if (!tokens.length) {
    return {
      encontrado: false,
      motivo: "A pergunta não tem termos suficientes para busca.",
      candidatos: []
    };
  }

  const resultados = [];

  for (const arquivo of arquivos) {
    const conteudo = fs.readFileSync(arquivo, "utf-8");
    const score = pontuarChunk(tokens, conteudo);

    if (score > 0) {
      resultados.push({
        arquivo: path.relative(ROOT, arquivo),
        score,
        conteudo
      });
    }
  }

  resultados.sort((a, b) => b.score - a.score);

  return {
    encontrado: resultados.length > 0,
    motivo: resultados.length > 0
      ? "Chunk candidato encontrado."
      : "Nenhum chunk correspondeu aos termos da pergunta.",
    candidatos: resultados.slice(0, limite)
  };
}

function montarResposta(pergunta, resultado) {
  if (!resultado.encontrado) {
    return [
      "AIGAR — leitura de biblioteca",
      "",
      "Ainda não encontrei base suficiente na biblioteca local.",
      "Motivo: " + resultado.motivo,
      "",
      "Tente uma palavra-chave mais específica."
    ].join("\n");
  }

  const melhor = resultado.candidatos[0];

  return [
    "AIGAR — biblioteca consultada",
    "",
    "Pergunta:",
    pergunta,
    "",
    "Fonte mais provável:",
    melhor.arquivo,
    "",
    "Score:",
    String(melhor.score),
    "",
    "Trecho recuperado:",
    "",
    melhor.conteudo.slice(0, 3500)
  ].join("\n");
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AIGAR backend",
    status: "online",
    endpoints: ["/health", "/perguntar"],
    porta: PORT
  });
});

app.get("/health", (req, res) => {
  const chunks = listarChunks();

  res.json({
    ok: true,
    service: "AIGAR backend",
    porta: PORT,
    chunks_detectados: chunks.length,
    biblioteca: "Engines/Aurora/Bibliotecas/Fisiologia",
    time: new Date().toISOString()
  });
});

app.post("/perguntar", (req, res) => {
  try {
    const pergunta = req.body.pergunta || req.body.input || "";
    const resultado = buscarNaBiblioteca(pergunta);
    const resposta = montarResposta(pergunta, resultado);

    res.json({
      ok: true,
      pergunta,
      encontrado: resultado.encontrado,
      motivo: resultado.motivo,
      candidatos: resultado.candidatos.map(c => ({
        arquivo: c.arquivo,
        score: c.score
      })),
      resposta
    });
  } catch (erro) {
    res.status(500).json({ ok: false, erro: erro.message });
  }
});

app.listen(PORT, () => console.log(`Motor rodando na porta ${PORT}`));
