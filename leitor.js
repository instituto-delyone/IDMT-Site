const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

const ROOT = __dirname;
const AURORA_ROOT = path.join(ROOT, "Engines", "Aurora");
const LINGUAGEM_MATERNA_DIR = path.join(AURORA_ROOT, "Bibliotecas", "Linguagem materna");

const ALLOWED_EXTENSIONS = new Set([".md", ".txt"]);
const SOFT_IGNORE_NAMES = new Set(["README.md", "LEIA-ME.md", "README_PATCH.md"]);
const HARD_IGNORE_PARTS = ["node_modules", ".git", ".github", ".DS_Store"];

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
    "que","qual","quais","como","onde","quando","porque","por","para","com","sem",
    "uma","umas","uns","dos","das","de","do","da","em","no","na","nos","nas",
    "o","a","os","as","e","ou","um","me","te","voce","você","sobre","explique",
    "defina","diga","fale","pra","pro","isso","essa","esse","aquilo"
  ]);
  return normalizar(texto).split(" ").filter(t => t.length > 2 && !stopwords.has(t));
}

function caminhoRelativo(arquivo) {
  return path.relative(ROOT, arquivo).replace(/\\/g, "/");
}

function deveIgnorarDiretorio(dir) {
  return HARD_IGNORE_PARTS.some(part => dir.includes(part));
}

function listarArquivosRecursivo(dir) {
  const arquivos = [];
  if (!fs.existsSync(dir) || deveIgnorarDiretorio(dir)) return arquivos;

  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...listarArquivosRecursivo(full));
    } else if (ALLOWED_EXTENSIONS.has(path.extname(entrada.name))) {
      arquivos.push(full);
    }
  }
  return arquivos;
}

function carregarLinguagemMaterna() {
  return listarArquivosRecursivo(LINGUAGEM_MATERNA_DIR)
    .filter(a => !path.basename(a).startsWith("README"))
    .map(arquivo => {
      try { return { arquivo: caminhoRelativo(arquivo), conteudo: fs.readFileSync(arquivo, "utf-8") }; }
      catch { return null; }
    })
    .filter(Boolean);
}

function classificarIntencao(pergunta) {
  const texto = normalizar(pergunta);
  const resposta = { id: "exploratory", label: "Exploratória", requires_library: true, depth: "normal", confidence: 0.45 };

  if (!texto || texto.length < 2) {
    return { id: "empty", label: "Entrada vazia ou curta demais", requires_library: false, depth: "normal", confidence: 0.1 };
  }

  const faticos = ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "voce esta ai", "consegue me ouvir", "consegue me entender"];
  if (faticos.some(p => texto === normalizar(p) || texto.includes(normalizar(p)))) {
    return { id: "phatic", label: "Fática", requires_library: false, depth: "short", confidence: 0.95 };
  }

  if (["brevemente","resuma","resumo","em poucas palavras","rapido"].some(p => texto.includes(normalizar(p)))) resposta.depth = "brief";
  if (["simples","de maneira simples","para leigo","facil"].some(p => texto.includes(normalizar(p)))) resposta.depth = "simple";
  if (["profundamente","detalhado","destrincha","completo","tecnicamente"].some(p => texto.includes(normalizar(p)))) resposta.depth = "deep";

  const clinicos = ["paciente","dor","febre","dispneia","saturacao","pressao","exame fisico","diagnostico","conduta","tratamento","hipotese"];
  if (clinicos.some(p => texto.includes(normalizar(p)))) {
    return { id: "clinical_case", label: "Caso clínico", requires_library: true, depth: resposta.depth, confidence: 0.8 };
  }

  const conceito = ["o que e","o que é","defina","explique o que e","explique o que é","significado"];
  if (conceito.some(p => texto.includes(normalizar(p)))) {
    return { id: "concept_basic", label: "Conceitual básica", requires_library: true, depth: resposta.depth, confidence: 0.8 };
  }

  const delimitada = ["quais","qual","funcao","função","formam","causada","causa","mecanismo","relacao","relação"];
  if (delimitada.some(p => texto.includes(normalizar(p)))) {
    return { id: "concept_scoped", label: "Conceitual delimitada", requires_library: true, depth: resposta.depth, confidence: 0.65 };
  }

  return resposta;
}

function pontuarArquivo(tokens, conteudo, arquivo) {
  const texto = normalizar(conteudo);
  let score = 0;
  for (const token of tokens) if (texto.includes(token)) score += 1;

  if (SOFT_IGNORE_NAMES.has(path.basename(arquivo))) score -= 2;
  if (caminhoRelativo(arquivo).includes("Linguagem materna")) score += 0.4;

  return score;
}

function extrairTrecho(conteudo, tokens, tamanho = 2600) {
  const textoNormalizado = normalizar(conteudo);
  let pos = -1;
  for (const token of tokens) {
    pos = textoNormalizado.indexOf(token);
    if (pos >= 0) break;
  }
  if (pos < 0) return conteudo.slice(0, tamanho);
  return conteudo.slice(Math.max(0, pos - 500), Math.max(0, pos - 500) + tamanho);
}

function buscarFontes(pergunta, limite = 5) {
  const tokens = tokenizar(pergunta);
  const arquivos = listarArquivosRecursivo(AURORA_ROOT);

  if (!tokens.length) return { found: false, reason: "Entrada sem termos suficientes para busca.", candidates: [], scanned_files: arquivos.length };

  const resultados = [];
  for (const arquivo of arquivos) {
    try {
      const conteudo = fs.readFileSync(arquivo, "utf-8");
      const score = pontuarArquivo(tokens, conteudo, arquivo);
      if (score > 0) resultados.push({ arquivo: caminhoRelativo(arquivo), score, trecho: extrairTrecho(conteudo, tokens) });
    } catch {}
  }

  resultados.sort((a, b) => b.score - a.score);
  return {
    found: resultados.length > 0,
    reason: resultados.length ? "Fontes candidatas encontradas." : "Nenhuma fonte correspondeu aos termos.",
    candidates: resultados.slice(0, limite),
    scanned_files: arquivos.length
  };
}

function responderFatico() {
  return [
    "AIGAR — resposta fática",
    "",
    "Olá. Estou online e pronto para interpretar sua entrada.",
    "",
    "Você pode me pedir uma definição, uma explicação, uma análise de caso ou uma busca em biblioteca."
  ].join("\n");
}

function montarResposta({ pergunta, intencao, busca }) {
  if (intencao.id === "phatic") return responderFatico();

  if (!busca.found) {
    return [
      "AIGAR — leitura inicial",
      "",
      "Intenção detectada:",
      `${intencao.label} (${intencao.id})`,
      "",
      "Ainda não encontrei fonte suficiente nas bibliotecas disponíveis.",
      "Motivo: " + busca.reason,
      "",
      "Você pode reformular, especificar o domínio ou inserir uma fonte nova na biblioteca."
    ].join("\n");
  }

  const melhor = busca.candidates[0];
  const profundidade = ({ short:"breve", brief:"breve", simple:"simples", normal:"normal", deep:"profunda" })[intencao.depth] || "normal";

  return [
    "AIGAR — resposta orientada por Linguagem materna",
    "",
    "Intenção detectada:",
    `${intencao.label} (${intencao.id})`,
    "",
    "Profundidade:",
    profundidade,
    "",
    "Fonte mais provável:",
    melhor.arquivo,
    "",
    "Score:",
    String(melhor.score),
    "",
    "Trecho recuperado:",
    "",
    melhor.trecho
  ].join("\n");
}

app.get("/", (req, res) => {
  res.json({ ok: true, service: "AIGAR backend", status: "online", version: "0.2.0", endpoints: ["/health", "/perguntar"], port: PORT });
});

app.get("/health", (req, res) => {
  const arquivosAurora = listarArquivosRecursivo(AURORA_ROOT);
  const linguagemMaterna = carregarLinguagemMaterna();
  res.json({
    ok: true,
    service: "AIGAR backend",
    version: "0.2.0",
    port: PORT,
    aurora_root: "Engines/Aurora",
    arquivos_lidos_em_aurora: arquivosAurora.length,
    linguagem_materna_blocos: linguagemMaterna.length,
    time: new Date().toISOString()
  });
});

app.post("/perguntar", (req, res) => {
  try {
    const pergunta = req.body.pergunta || req.body.input || "";
    carregarLinguagemMaterna(); // força leitura da base antes da classificação
    const intencao = classificarIntencao(pergunta);
    const busca = intencao.requires_library ? buscarFontes(pergunta) : { found: false, reason: "Esta intenção não exige biblioteca.", candidates: [], scanned_files: 0 };
    const resposta = montarResposta({ pergunta, intencao, busca });
    res.json({
      ok: true,
      pergunta,
      intencao,
      found: busca.found,
      reason: busca.reason,
      scanned_files: busca.scanned_files,
      candidates: busca.candidates.map(c => ({ arquivo: c.arquivo, score: c.score })),
      resposta
    });
  } catch (erro) {
    res.status(500).json({ ok: false, erro: erro.message });
  }
});

app.listen(PORT, () => console.log(`AIGAR backend rodando na porta ${PORT}`));
