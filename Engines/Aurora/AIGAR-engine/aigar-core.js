/* AIGAR Core v0.4 — pipeline com modulação humana + fallback local */
(function(){
  const AIGAR_BACKEND_URL = "https://idmt-site-production.up.railway.app/perguntar";

  function appendMessage(type, title, text){
    const log = document.getElementById("chat-log");
    if(!log) return;
    const box = document.createElement("div");
    box.className = "message " + type;
    box.innerHTML = "<strong></strong><p></p>";
    box.querySelector("strong").textContent = title;
    box.querySelector("p").textContent = text;
    log.appendChild(box);
    box.scrollIntoView({behavior:"smooth", block:"end"});
  }

  function updateRAMView(){
    const count = document.getElementById("ram-count");
    const bits = document.getElementById("ram-bits");
    const logs = document.getElementById("log-count");

    if(window.MemoryEngine){
      if(count) count.textContent = MemoryEngine.count() + " registros";
      if(bits){
        const b = MemoryEngine.bits ? MemoryEngine.bits() : "00000000";
        bits.textContent = (b + " ").repeat(10).trim();
      }
    }

    if(window.LogEngine && logs){
      logs.textContent = LogEngine.count() + " logs salvos";
    }
  }

  function normalizar(texto){
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectarEntrada(input){
    const texto = normalizar(input);
    const leitura = {
      funcao: "exploratoria",
      profundidade: "normal",
      tom: "neutro",
      precisaBiblioteca: true
    };

    const faticos = ["oi", "ola", "bom dia", "boa tarde", "boa noite", "voce esta ai", "consegue me ouvir", "consegue me entender"];
    if(faticos.some(f => texto === normalizar(f) || texto.startsWith(normalizar(f)))){
      return {funcao:"fatica", profundidade:"breve", tom:"acolhedor", precisaBiblioteca:false};
    }

    if(texto.includes("brevemente") || texto.includes("resuma") || texto.includes("em poucas palavras") || texto.includes("rapido")){
      leitura.profundidade = "breve";
    }
    if(texto.includes("simples") || texto.includes("para leigo") || texto.includes("facil de entender") || texto.includes("sem termos tecnicos")){
      leitura.profundidade = "simples";
    }
    if(texto.includes("profundamente") || texto.includes("destrincha") || texto.includes("completo") || texto.includes("com raciocinio")){
      leitura.profundidade = "profunda";
    }
    if(texto.includes("tecnicamente") || texto.includes("termos medicos") || texto.includes("detalhado")){
      leitura.profundidade = "tecnica";
    }

    if(texto.includes("o que e") || texto.includes("defina") || texto.includes("explique o que e")){
      leitura.funcao = "conceitual_basica";
    }

    if(texto.includes("qual") || texto.includes("quais") || texto.includes("funcao") || texto.includes("mecanismo") || texto.includes("relacao")){
      leitura.funcao = "conceitual_delimitada";
    }

    const clinicos = ["paciente", "dor", "febre", "dispneia", "saturacao", "pressao", "diagnostico", "conduta", "tratamento", "hipotese"];
    if(clinicos.some(c => texto.includes(c))){
      leitura.funcao = "caso_clinico";
      if(leitura.profundidade === "normal") leitura.profundidade = "tecnica";
    }

    return leitura;
  }

  function respostaFatica(){
    return "Olá. Estou aqui. Pode me dizer se você quer uma definição, uma explicação, uma análise de caso ou uma busca em biblioteca?";
  }

  function limparRespostaBackend(texto){
    return String(texto || "")
      .replace(/^AIGAR\s[—-]\sresposta orientada por Linguagem materna\s*/i, "AIGAR — resposta\n")
      .replace(/^AIGAR\s[—-]\sleitura inicial\s*/i, "AIGAR — leitura inicial\n")
      .trim();
  }

  function modularTexto(textoBruto, leitura, dados){
    let texto = limparRespostaBackend(textoBruto);
    if(!texto) return "Ainda não consegui formular uma resposta a partir da entrada.";

    if(leitura.funcao === "fatica") return respostaFatica();

    const frases = texto.split(/(?<=[.!?])\s+/).filter(Boolean);

    if(leitura.profundidade === "breve" && frases.length > 3){
      return frases.slice(0, 3).join(" ") + "\n\nSe quiser, eu aprofundo.";
    }

    if(leitura.profundidade === "simples"){
      texto = texto
        .replace(/patogênese/gi, "origem do processo")
        .replace(/etiologia/gi, "causa")
        .replace(/idiopática/gi, "de causa desconhecida")
        .replace(/fisiopatologia/gi, "mecanismo da doença");

      if(!/^Explicando de forma simples:/i.test(texto)){
        texto = "Explicando de forma simples:\n\n" + texto;
      }
    }

    if(dados && dados.found === false && leitura.precisaBiblioteca){
      return [
        "AIGAR — leitura inicial",
        "",
        "Eu entendi a direção da pergunta, mas ainda não encontrei uma fonte forte o bastante na biblioteca atual.",
        "",
        "Leitura da entrada:",
        "- função: " + leitura.funcao,
        "- profundidade: " + leitura.profundidade,
        "",
        "Você pode reformular, delimitar o tema ou inserir uma fonte nova na Linguagem materna/biblioteca."
      ].join("\n");
    }

    return texto;
  }

  function registrarMemoria(role, text, meta){
    if(!window.MemoryEngine || !MemoryEngine.add) return;
    MemoryEngine.add(role, text, meta || {});
  }

  async function chamarBackend(input, leitura){
    const respostaServidor = await fetch(AIGAR_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta: input, leitura_aigar: leitura })
    });

    if(!respostaServidor.ok){
      throw new Error("Backend respondeu com status " + respostaServidor.status);
    }

    return await respostaServidor.json();
  }

  async function runPipeline(input){
    const leitura = detectarEntrada(input);

    registrarMemoria("user", input, { source: "AIGAR_FRONTEND", leitura });

    if(leitura.funcao === "fatica"){
      const resposta = respostaFatica();
      registrarMemoria("AIGAR", resposta, { source: "AIGAR_FRONTEND_MODULATOR", leitura, found:false });
      return resposta;
    }

    try {
      const dados = await chamarBackend(input, leitura);
      const textoCru = typeof dados.resposta === "string" ? dados.resposta : JSON.stringify(dados, null, 2);
      const respostaFinal = modularTexto(textoCru, leitura, dados);

      registrarMemoria("AIGAR", respostaFinal, {
        source: "AIGAR_RAILWAY_BACKEND",
        backend_url: AIGAR_BACKEND_URL,
        leitura,
        found: dados.found ?? dados.encontrado ?? false,
        reason: dados.reason || null,
        candidates: dados.candidates || []
      });

      return respostaFinal;

    } catch (erro) {
      console.warn("Railway indisponível, usando runtime local:", erro);

      const memoryContext = window.MemoryEngine && MemoryEngine.context ? MemoryEngine.context(8) : "";
      const packet = window.CSIEngine && CSIEngine.prepareForAIGAR
        ? CSIEngine.prepareForAIGAR(input)
        : {intent_domain:"general", semantic_matches:[], leitura};

      const route = window.LibraryRouter && LibraryRouter.routeFromCSIPacket
        ? LibraryRouter.routeFromCSIPacket(packet)
        : null;

      if(window.TimeEngine && TimeEngine.stamp) TimeEngine.stamp("aigar_pipeline_start");

      const result = window.ReasoningEngine
        ? await ReasoningEngine.think({input, packet, route, memoryContext, leitura})
        : {understood:false, response:"Reasoning-engine não carregada e backend indisponível."};

      const respostaFinal = modularTexto(result.response, leitura, {found: result.understood});

      registrarMemoria("AIGAR", respostaFinal, {
        source: "AIGAR_LOCAL_FALLBACK",
        understood: result.understood,
        latent: result.latent || null,
        domain: packet.intent_domain || "general",
        leitura
      });

      if(window.TimeEngine && TimeEngine.stamp) TimeEngine.stamp("aigar_pipeline_end");

      return respostaFinal;
    }
  }

  function bindPortal(){
    const form = document.getElementById("aigar-form");
    const input = document.getElementById("aigar-input");
    const button = document.getElementById("send-button");
    const saveButton = document.getElementById("save-log-button");
    const exportButton = document.getElementById("export-log-button");

    if(form && input){
      form.addEventListener("submit", async function(event){
        event.preventDefault();

        const text = input.value.trim();
        if(!text) return;

        appendMessage("user", "Você", text);
        input.value = "";

        if(button){
          button.disabled = true;
          button.textContent = "Raciocinando";
        }

        appendMessage("aigar processing", "AIGAR", "Lendo entrada → reconhecendo função → consultando Linguagem materna → buscando fonte → modulando resposta...");

        const response = await runPipeline(text);
        appendMessage("aigar", "AIGAR", response);

        updateRAMView();

        if(button){
          button.disabled = false;
          button.textContent = "Processar";
        }
      });
    }

    if(saveButton){
      saveButton.addEventListener("click", function(){
        if(!window.LogEngine){
          appendMessage("aigar", "AIGAR", "Log-engine não está carregada.");
          return;
        }
        const saved = LogEngine.saveCurrentSession();
        appendMessage("aigar", "AIGAR", "Raciocínio salvo manualmente em log local: " + saved.id);
        updateRAMView();
      });
    }

    if(exportButton){
      exportButton.addEventListener("click", function(){
        if(window.LogEngine) LogEngine.download();
      });
    }

    updateRAMView();
  }

  window.AIGAR = {
    version: "0.4",
    bindPortal,
    runPipeline,
    updateRAMView,
    detectarEntrada,
    modularTexto
  };
})();
