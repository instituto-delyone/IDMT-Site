/* =========================================================
   Latent Question Engine v0.1
   Descobre a pergunta real antes da resposta.
   Path: /Engines/Aurora/Reasoning-engine/latent-question-engine.js
   ========================================================= */

(function(){
  const LatentQuestionEngine = {
    version: "0.1",

    normalize(text){
      return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    infer(input, packet = {}, memoryContext = "", route = null){
      const text = this.normalize(input);
      const domain = packet.intent_domain || "general";
      const hasRoute = Boolean(route && route.candidates && route.candidates.length);
      const hasMemory = Boolean(memoryContext && memoryContext.trim().length > 0);

      const signals = {
        asks_if_understood: text.includes("voce consegue me entender") || text.includes("consegue me entender"),
        wants_build: ["criar", "montar", "fazer", "construir", "programar", "codigo", "html", "engine"].some(x => text.includes(x)),
        wants_explain: ["explica", "entender", "como funciona", "o que significa", "por que"].some(x => text.includes(x)),
        clinical: domain === "clinical",
        document: domain === "document",
        temporal: domain === "temporal",
        semantic: domain === "semantic",
        code: domain === "code",
        has_route: hasRoute,
        has_memory: hasMemory
      };

      let latent = "Qual é a estrutura mínima necessária para responder ao input sem inventar contexto?";

      if(signals.asks_if_understood){
        latent = "O usuário está testando continuidade, compreensão contextual e ausência de resposta automática?";
      }else if(signals.wants_build || signals.code){
        latent = "Qual alteração computacional mínima transforma a intenção do usuário em estrutura funcional?";
      }else if(signals.clinical){
        latent = "Qual é o problema clínico real, quais dados faltam e qual raciocínio seguro pode ser estruturado?";
      }else if(signals.document){
        latent = "Que fatos, evidências, datas e lacunas precisam ser separados para tornar o documento auditável?";
      }else if(signals.temporal){
        latent = "Que evento, estado anterior, estado atual e continuidade temporal estão sendo descritos?";
      }else if(signals.semantic){
        latent = "Qual conceito, relação ou equivalência semântica precisa ser estabilizada?";
      }else if(signals.wants_explain){
        latent = "Qual dúvida conceitual está implícita no texto e qual camada de explicação resolve melhor?";
      }

      const confidence =
        (signals.has_route ? 0.25 : 0) +
        (signals.has_memory ? 0.15 : 0) +
        (domain !== "general" ? 0.35 : 0) +
        (Object.values(signals).some(Boolean) ? 0.25 : 0);

      return {
        engine: "LatentQuestionEngine",
        version: this.version,
        input,
        domain,
        latent_question: latent,
        confidence: Math.min(1, confidence),
        signals,
        route_available: hasRoute,
        memory_available: hasMemory
      };
    }
  };

  window.LatentQuestionEngine = LatentQuestionEngine;
})();
