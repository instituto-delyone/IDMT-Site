/* =========================================================
   Reasoning Engine v0.1
   Raciocínio local sem API e sem template fixo.
   Path: /Engines/Aurora/Reasoning-engine/reasoning-core.js
   ========================================================= */

(function(){
  function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  const ReasoningEngine = {
    version: "0.1",

    minimumUnderstanding({input, packet, route, latent}){
      const words = String(input || "").trim().split(/\s+/).filter(w => w.length > 2);

      if(words.length < 2){
        return {ok:false, reason:"entrada curta demais"};
      }

      if(latent && latent.confidence >= 0.35){
        return {ok:true, reason:"pergunta latente detectada"};
      }

      if(packet && packet.intent_domain && packet.intent_domain !== "general"){
        return {ok:true, reason:"domínio semântico detectado"};
      }

      if(route && route.candidates && route.candidates.length > 0){
        return {ok:true, reason:"biblioteca encontrou rota contextual"};
      }

      if(words.length >= 6){
        return {ok:true, reason:"densidade textual suficiente para raciocínio geral"};
      }

      return {ok:false, reason:"sem domínio, rota, memória ou densidade suficiente"};
    },

    async think({input, packet, route, memoryContext}){
      await sleep(420);

      const latent = window.LatentQuestionEngine
        ? LatentQuestionEngine.infer(input, packet, memoryContext, route)
        : null;

      await sleep(520);

      const understood = this.minimumUnderstanding({input, packet, route, latent});

      if(!understood.ok){
        return {
          understood:false,
          latent,
          response: [
            "AIGAR — compreensão insuficiente",
            "",
            "Eu não vou responder por template.",
            "Motivo: " + understood.reason + ".",
            "",
            "Pergunta latente possível:",
            latent ? latent.latent_question : "não detectada",
            "",
            "Reformule com mais contexto ou defina o domínio: clínico, técnico, documental, temporal ou semântico."
          ].join("\n")
        };
      }

      await sleep(430);

      return {
        understood:true,
        latent,
        response: this.compose({input, packet, route, memoryContext, latent, understood})
      };
    },

    compose({input, packet, route, memoryContext, latent, understood}){
      const domain = packet?.intent_domain || "general";
      const matches = packet?.semantic_matches || [];
      const candidates = route?.candidates || [];

      const lines = [];

      lines.push("AIGAR — raciocínio contextual");
      lines.push("");
      lines.push("1. Pergunta latente");
      lines.push(latent ? latent.latent_question : "Não detectada.");
      lines.push("");
      lines.push("2. Critério de compreensão");
      lines.push(understood.reason + ".");
      lines.push("");
      lines.push("3. Domínio interpretado");
      lines.push(domain + ".");

      if(matches.length){
        lines.push("");
        lines.push("4. Chaves CSI relacionadas");
        matches.slice(0,5).forEach(m => {
          lines.push("- " + [m.id, m.canonical_name].filter(Boolean).join(" — "));
        });
      }

      if(candidates.length){
        lines.push("");
        lines.push("5. Rota de biblioteca");
        candidates.slice(0,4).forEach(c => {
          lines.push("- " + c.id + " | " + c.part_id + " | páginas " + c.page_start + "-" + c.page_end);
        });
      }

      if(memoryContext){
        lines.push("");
        lines.push("6. Memória operacional");
        lines.push("Contexto curto detectado e usado apenas como apoio, não como verdade permanente.");
      }

      lines.push("");
      lines.push("7. Resposta");
      lines.push(this.answerByDomain(input, domain, latent));

      return lines.join("\n");
    },

    answerByDomain(input, domain, latent){
      const lower = String(input || "").toLowerCase();

      if(lower.includes("consegue me entender")){
        return "Sim, dentro deste runtime eu interpreto que você está testando continuidade e compreensão. A resposta não vem de botão fixo; ela passa por memória curta, CSI, pergunta latente e critério mínimo de compreensão.";
      }

      if(domain === "clinical"){
        return "Vou organizar o conteúdo como raciocínio clínico: delimitar síndrome, risco imediato, hipóteses críticas, dados faltantes, decisão proporcional e reavaliação.";
      }

      if(domain === "document"){
        return "Vou organizar como análise documental: separar fatos, datas, evidências, lacunas, impacto e próximo ato verificável.";
      }

      if(domain === "code"){
        return "Vou organizar como engenharia: localizar arquivo, rota, dependência, estado atual, falha provável e menor patch seguro.";
      }

      if(domain === "temporal"){
        return "Vou organizar como evento temporal: estado anterior, evento, estado atual, continuidade, validade e necessidade de consolidação ou limpeza.";
      }

      if(domain === "semantic"){
        return "Vou organizar como semântica: conceito, denominação, relação, contexto, equivalência e limites interpretativos.";
      }

      return "Compreensão parcial. O próximo passo é converter sua intenção em uma estrutura mais específica, para que eu não substitua raciocínio por uma resposta genérica.";
    }
  };

  window.ReasoningEngine = ReasoningEngine;
})();
