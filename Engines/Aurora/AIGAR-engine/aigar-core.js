/* AIGAR Core v0.3 — pipeline local sem API */
(function(){
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
        const b = MemoryEngine.bits();
        bits.textContent = (b + " ").repeat(10).trim();
      }
    }

    if(window.LogEngine && logs){
      logs.textContent = LogEngine.count() + " logs salvos";
    }
  }

async function runPipeline(input){

  const AIGAR_BACKEND_URL = "https://idmt-site-production.up.railway.app/perguntar";

  try {

    const respostaServidor = await fetch(AIGAR_BACKEND_URL, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ pergunta: input })

    });

    const dados = await respostaServidor.json();

    if (dados && dados.resposta) {

      if (window.MemoryEngine) {

        MemoryEngine.add("aiger", dados.resposta, {

          source: "railway_backend",

          found: dados.encontrado || false

        });

      }

      return dados.resposta;

    }

  } catch (erro) {

    console.warn("Railway indisponível, usando runtime local:", erro);
  }
  
    if(window.MemoryEngine){
      MemoryEngine.add("user", input);
    }

    const memoryContext = window.MemoryEngine ? MemoryEngine.context(8) : "";

    const packet = window.CSIEngine && CSIEngine.prepareForAIGAR
      ? CSIEngine.prepareForAIGAR(input)
      : {intent_domain:"general", semantic_matches:[]};

    const route = window.LibraryRouter && LibraryRouter.routeFromCSIPacket
      ? LibraryRouter.routeFromCSIPacket(packet)
      : null;

    if(window.TimeEngine && TimeEngine.stamp){
      TimeEngine.stamp("aigar_pipeline_start");
    }

    const result = window.ReasoningEngine
      ? await ReasoningEngine.think({input, packet, route, memoryContext})
      : {understood:false, response:"Reasoning-engine não carregada."};

    if(window.MemoryEngine){
      MemoryEngine.add("aiger", result.response, {
        understood: result.understood,
        latent: result.latent || null,
        domain: packet.intent_domain || "general"
      });
    }

    if(window.TimeEngine && TimeEngine.stamp){
      TimeEngine.stamp("aigar_pipeline_end");
    }

    return result.response;
  }

  function bindPortal(){
    const form = document.getElementById("aiger-form");
    const input = document.getElementById("aiger-input");
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

        appendMessage("aiger processing", "AIGER", "Interpretando input → consultando memória → refinando significado → formulando pergunta latente → raciocinando...");

        const response = await runPipeline(text);
        appendMessage("aiger", "AIGER", response);

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
          appendMessage("aiger", "AIGER", "Log-engine não está carregada.");
          return;
        }
        const saved = LogEngine.saveCurrentSession();
        appendMessage("aiger", "AIGER", "Raciocínio salvo manualmente em log local: " + saved.id);
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
    version: "0.3",
    bindPortal,
    runPipeline,
    updateRAMView
  };
})();
