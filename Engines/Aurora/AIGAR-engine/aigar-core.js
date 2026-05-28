/* AIGAR Engine v0.1 — local prototype grounded in MC_BASE v1.1 */
(function(){
  const state = {loaded:false, mcBase:"", hybridReasoning:"", auroraPrinciples:"", mode:"local-prototype"};
  const paths = {
    mcBase:"/Engines/Aurora/AIGAR-engine/MC_BASE_AIGAR_v1.1.yaml",
    hybridReasoning:"/Engines/Aurora/AIGAR-engine/raciocinio_rapido_hibrido.txt",
    auroraPrinciples:"/Engines/Aurora/AIGAR-engine/MC_PRINCIPIOS_AURORA.yaml"
  };
  document.addEventListener("DOMContentLoaded", init);

  async function init(){
    await loadCoreFiles();
    updateStatus();
    const form = document.getElementById("aiger-form");
    const input = document.getElementById("aiger-input");
    const log = document.getElementById("chat-log");
    if(!form || !input || !log) return;

    form.addEventListener("submit", function(event){
      event.preventDefault();
      const text = input.value.trim();
      if(!text) return;
      appendMessage("user","Você",text);
      input.value = "";
      const response = AIGAR.respond(text);
      window.setTimeout(function(){ appendMessage("aiger","AIGER",response); }, 280);
    });

    document.querySelectorAll("[data-prompt]").forEach((button)=>{
      button.addEventListener("click",()=>{
        input.value = button.dataset.prompt + "\n\n";
        input.focus();
      });
    });
  }

  async function loadCoreFiles(){
    await Promise.allSettled([
      fetchText(paths.mcBase).then(t=>state.mcBase=t),
      fetchText(paths.hybridReasoning).then(t=>state.hybridReasoning=t),
      fetchText(paths.auroraPrinciples).then(t=>state.auroraPrinciples=t)
    ]);
    state.loaded = Boolean(state.mcBase || state.hybridReasoning || state.auroraPrinciples);
  }

  async function fetchText(path){
    try{
      const response = await fetch(path, {cache:"no-store"});
      if(!response.ok) return "";
      return await response.text();
    }catch(error){ return ""; }
  }

  function updateStatus(){
    const status = document.getElementById("aigar-status");
    if(status) status.textContent = state.loaded ? "núcleo v1.1 detectado" : "modo local sem arquivos";
  }

  function appendMessage(type,title,text){
    const log = document.getElementById("chat-log");
    const box = document.createElement("div");
    box.className = "message " + type;
    box.innerHTML = "<strong></strong><p></p>";
    box.querySelector("strong").textContent = title;
    box.querySelector("p").textContent = text;
    log.appendChild(box);
    box.scrollIntoView({behavior:"smooth", block:"end"});
  }

  function containsAny(text, terms){
    const lower = text.toLowerCase();
    return terms.some(term => lower.includes(term));
  }

  function buildStructuredAnswer(text){
    const isClinical = containsAny(text, ["paciente","diagnóstico","diagnostico","conduta","dor","dispneia","febre","pressão","pa","saturação","ecg","exame"]);
    const isDocument = containsAny(text, ["documento","prova","processo","linha do tempo","pdf","petição","peticao","relatório","relatorio"]);
    const isCode = containsAny(text, ["html","css","javascript","js","código","codigo","github","netlify","deploy","branch"]);

    if(isClinical){
      return [
        "Leitura AIGAR — modo clínico",
        "",
        "1. Problema principal: identificar a síndrome dominante e separar queixa, sinais objetivos e risco imediato.",
        "2. Hipóteses críticas: priorizar o que muda conduta ou ameaça vida.",
        "3. Dados que faltam: sinais vitais, tempo, exame físico dirigido, exames iniciais e resposta às medidas.",
        "4. Conduta inicial: estabilizar, documentar, tratar risco proporcional e definir reavaliação.",
        "5. Feedback: atualizar probabilidade após cada nova informação."
      ].join("\n");
    }

    if(isDocument){
      return [
        "Leitura AIGAR — modo documental",
        "",
        "1. Linha do tempo: separar data do evento, formalização e consequência prática.",
        "2. Fatos: extrair eventos verificáveis antes de interpretar intenção.",
        "3. Evidências: vincular cada afirmação a documento, print, protocolo ou registro.",
        "4. Impacto: separar dano financeiro, administrativo, profissional, emocional e probatório.",
        "5. Próximo passo: transformar material em árvore de documentos e narrativa auditável."
      ].join("\n");
    }

    if(isCode){
      return [
        "Leitura AIGAR — modo engenharia",
        "",
        "1. Estrutura: separar interface, engine, assets, dados e rotas.",
        "2. Caminho de arquivo: usar rotas raiz como /Aiger/, /Engines/, /Comercial/.",
        "3. Modularidade: CSS, JS e README dentro da engine correspondente.",
        "4. Teste: validar no laboratório antes de promover para main.",
        "5. Release: registrar mudança com commit, tag ou texto de release."
      ].join("\n");
    }

    return [
      "Leitura AIGAR — modo geral",
      "",
      "1. Contexto: definir onde o problema está localizado.",
      "2. Camadas: separar linguagem, lógica, evidência, execução e feedback.",
      "3. Hipóteses alternativas: se A for verdade, então X; se não, então Y.",
      "4. Ação mínima segura: escolher o próximo passo que reduz incerteza sem aumentar risco.",
      "5. Síntese: estruturar antes de acelerar."
    ].join("\n");
  }

  window.AIGAR = {state, respond:function(text){return buildStructuredAnswer(text);}};
})();
