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
  const stop = new Set([
    "que","qual","quais","como","onde","quando","porque","por","para","com","sem",
    "uma","umas","uns","dos","das","de","do","da","em","no","na","nos","nas",
    "o","a","os","as","e","ou","um","me","te","voce","sobre","explique","defina",
    "diga","fale","pra","pro","isso","essa","esse","aquilo","forma","maneira",
    "simples","breve","rapido","resuma","poucas","palavras"
  ]);

  return normalizar(texto).split(" ").filter(t => t.length > 2 && !stop.has(t));
}

function caminhoRelativo(arquivo) {
  return path.relative(ROOT, arquivo).replace(/\\/g, "/");
}

function listarArquivosRecursivo(dir) {
  const arquivos = [];
  if (!fs.existsSync(dir)) return arquivos;
  if (HARD_IGNORE_PARTS.some(p => dir.includes(p))) return arquivos;

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
  return listarArquivosRecursivo(LINGUAGEM_MATERNA_DIR).length;
}

function classificarIntencao(pergunta) {
  const texto = normalizar(pergunta);
  let resposta = {
    id: "exploratory",
    label: "Exploratória",
    requires_library: true,
    depth: "normal",
    domain_hint: "geral",
    confidence: 0.45
  };

  if (!texto || texto.length < 2) {
    return { ...resposta, id: "empty", label: "Entrada vazia", requires_library: false };
  }

  const faticos = ["oi", "ola", "bom dia", "boa tarde", "boa noite", "voce esta ai", "consegue me ouvir"];
  if (faticos.some(p => texto === normalizar(p) || texto.includes(normalizar(p)))) {
    return { ...resposta, id: "phatic", label: "Fática", requires_library: false, depth: "short", confidence: 0.95 };
  }

  if (["brevemente","resuma","resumo","em poucas palavras","rapido"].some(p => texto.includes(normalizar(p)))) resposta.depth = "brief";
  if (["simples","de maneira simples","para leigo","facil"].some(p => texto.includes(normalizar(p)))) resposta.depth = "simple";
  if (["profundamente","detalhado","destrincha","completo","tecnicamente","cientificamente"].some(p => texto.includes(normalizar(p)))) resposta.depth = "deep";

  const termosMedicos = [
    "hemoglobina","hemacia","eritrocito","anemia","oxigenio","ferro","heme",
    "paciente","dor","febre","dispneia","saturacao","pressao","diagnostico",
    "conduta","tratamento","hipotese","fisiologia","hematologia","proteina","doenca"
  ];

  if (termosMedicos.some(p => texto.includes(normalizar(p)))) resposta.domain_hint = "medicina";

  const clinicos = ["paciente","dor","febre","dispneia","saturacao","pressao","diagnostico","conduta","tratamento","hipotese"];
  if (clinicos.some(p => texto.includes(normalizar(p)))) {
    return { ...resposta, id: "clinical_case", label: "Caso clínico", domain_hint: "medicina", confidence: 0.8 };
  }

  const conceito = ["o que e","defina","explique o que e","significado"];
  if (conceito.some(p => texto.includes(normalizar(p)))) {
    return { ...resposta, id: "concept_basic", label: "Conceitual básica", confidence: 0.8 };
  }

  const delimitada = ["quais","qual","funcao","formam","causada","causa","mecanismo","relacao"];
  if (delimitada.some(p => texto.includes(normalizar(p)))) {
    return { ...resposta, id: "concept_scoped", label: "Conceitual delimitada", confidence: 0.65 };
  }

  return resposta;
}

function lerArquivo(arquivo) {
  try { return fs.readFileSync(arquivo, "utf-8"); }
  catch { return ""; }
}

function extrairMetadados(conteudo) {
  const m = conteudo.match(/\[METADADOS\]([\s\S]*?)\[\/METADADOS\]/i);
  return m ? m[1] : "";
}

function pontuarArquivo(tokens, conteudo, arquivo, intencao) {
  const texto = normalizar(conteudo);
  const rel = caminhoRelativo(arquivo);
  const relNorm = normalizar(rel);
  const nome = normalizar(path.basename(arquivo, path.extname(arquivo)));
  const meta = normalizar(extrairMetadados(conteudo));

  const isLingua = rel.includes("Linguagem materna") || rel.includes("Linguagem-materna");
  const isMedicina = rel.includes("Bibliotecas/Medicina") || rel.includes("/Medicina/") || rel.includes("Medicina/");
  let score = 0;

  for (const token of tokens) {
    if (nome.includes(token)) score += 10;
    if (relNorm.includes(token)) score += 7;
    if (meta.includes(token)) score += 6;
    if (texto.includes("# " + token)) score += 6;
    if (texto.includes(token)) score += 1;
  }

  if (isLingua && intencao.domain_hint === "medicina") score -= 8;
  if (isLingua && intencao.domain_hint !== "medicina") score += 1;
  if (isMedicina && intencao.domain_hint === "medicina") score += 8;

  if ((meta.includes("dominio medicina") || meta.includes("dominio: medicina") || meta.includes("hematologia")) && intencao.domain_hint === "medicina") {
    score += 8;
  }

  if (path.basename(arquivo).toLowerCase().startsWith("readme")) score -= 2;

  return score;
}

function extrairTrecho(conteudo, tokens, tamanho = 2600) {
  const n = normalizar(conteudo);
  let pos = -1;

  for (const token of tokens) {
    pos = n.indexOf(token);
    if (pos >= 0) break;
  }

  if (pos < 0) return conteudo.slice(0, tamanho);
  const inicio = Math.max(0, pos - 500);
  return conteudo.slice(inicio, inicio + tamanho);
}

function buscarFontes(pergunta, intencao, limite = 5) {
  const tokens = tokenizar(pergunta);
  const arquivos = listarArquivosRecursivo(AURORA_ROOT);

  if (!tokens.length) {
    return { found: false, reason: "Entrada sem termos temáticos suficientes.", candidates: [], scanned_files: arquivos.length };
  }

  const resultados = [];

  for (const arquivo of arquivos) {
    const conteudo = lerArquivo(arquivo);
    if (!conteudo) continue;

    const score = pontuarArquivo(tokens, conteudo, arquivo, intencao);
    if (score > 0) {
      resultados.push({ arquivo: caminhoRelativo(arquivo), score, trecho: extrairTrecho(conteudo, tokens) });
    }
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

function montarResposta({ intencao, busca }) {
  if (intencao.id === "phatic") return responderFatico();

  if (!busca.found) {
    return [
      "AIGAR — leitura inicial",
      "",
      "Intenção detectada:",
      `${intencao.label} (${intencao.id})`,
      "",
      "Ainda não encontrei fonte suficiente nas bibliotecas disponíveis.",
      "Motivo: " + busca.reason
    ].join("\n");
  }

  const melhor = busca.candidates[0];
  const profundidade = ({ short:"breve", brief:"breve", simple:"simples", normal:"normal", deep:"profunda" })[intencao.depth] || "normal";

  return [
    "AIGAR — resposta",
    "",
    "Intenção detectada:",
    `${intencao.label} (${intencao.id})`,
    "",
    "Profundidade:",
    profundidade,
    "",
    "Domínio provável:",
    intencao.domain_hint,
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
  res.json({ ok: true, service: "AIGAR backend", status: "online", version: "0.3.0", endpoints: ["/health", "/perguntar"], port: PORT });
});

app.get("/health", (req, res) => {
  const arquivosAurora = listarArquivosRecursivo(AURORA_ROOT);
  const linguagemMaterna = carregarLinguagemMaterna();
  res.json({
    ok: true,
    service: "AIGAR backend",
    version: "0.3.0",
    port: PORT,
    aurora_root: "Engines/Aurora",
    arquivos_lidos_em_aurora: arquivosAurora.length,
    linguagem_materna_blocos: linguagemMaterna,
    time: new Date().toISOString()
  });
});

app.post("/perguntar", (req, res) => {
  try {
    const pergunta = req.body.pergunta || req.body.input || "";
    carregarLinguagemMaterna();
    const intencao = classificarIntencao(pergunta);
    const busca = intencao.requires_library
      ? buscarFontes(pergunta, intencao)
      : { found: false, reason: "Esta intenção não exige biblioteca.", candidates: [], scanned_files: 0 };

    const resposta = montarResposta({ intencao, busca });

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

app.listen(PORT, () => console.log(`AIGAR backend v0.3 rodando na porta ${PORT}`));
