/* =========================================================
   CSI Engine v0.1
   Classificação Semiológica Internacional
   Path: /Engines/Aurora/CSI-engine/csi-core.js
   ========================================================= */

(function(){
  const CSIEngine = {
    version: "0.1",
    loaded: false,
    raw: null,
    units: {},
    aliases: {},
    relations: {},

    async init(path = "/Engines/Aurora/CSI-engine/csi.json"){
      try{
        const response = await fetch(path, {cache:"no-store"});
        const text = await response.text();

        /*
          csi.json may contain multiple JSON objects appended sequentially.
          This loader extracts each top-level JSON block and merges them.
        */
        const objects = this.parseLooseJsonObjects(text);
        this.raw = objects;
        this.units = this.mergeObjects(objects);
        this.buildAliasIndex();
        this.buildRelationIndex();
        this.loaded = true;

        console.log("CSI Engine loaded:", Object.keys(this.units).length, "units");
        return this;
      }catch(error){
        console.warn("CSI Engine could not load csi.json", error);
        this.loaded = false;
        return this;
      }
    },

    parseLooseJsonObjects(text){
      const objects = [];
      let depth = 0;
      let start = null;
      let inString = false;
      let escape = false;

      for(let i = 0; i < text.length; i++){
        const ch = text[i];

        if(inString){
          if(escape){
            escape = false;
          }else if(ch === "\\"){
            escape = true;
          }else if(ch === '"'){
            inString = false;
          }
          continue;
        }

        if(ch === '"'){
          inString = true;
          continue;
        }

        if(ch === "{"){
          if(depth === 0) start = i;
          depth++;
        }else if(ch === "}"){
          depth--;
          if(depth === 0 && start !== null){
            const block = text.slice(start, i + 1);
            try{
              objects.push(JSON.parse(block));
            }catch(e){
              // ignore malformed conceptual fragments
            }
            start = null;
          }
        }
      }
      return objects;
    },

    mergeObjects(objects){
      const merged = {};
      objects.forEach(obj => {
        Object.keys(obj).forEach(key => {
          if(key.startsWith("CSI") || key.startsWith("PROJECT")){
            merged[key] = obj[key];
          }
        });
      });
      return merged;
    },

    normalize(text){
      return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    buildAliasIndex(){
      this.aliases = {};
      Object.entries(this.units).forEach(([id, unit]) => {
        const names = new Set();

        if(unit.canonical_name) names.add(unit.canonical_name);
        if(unit.definition) names.add(unit.definition);
        if(Array.isArray(unit.aliases)) unit.aliases.forEach(a => names.add(a));
        if(unit.domain) names.add(unit.domain);
        if(unit.principle) names.add(unit.principle);

        names.forEach(name => {
          const n = this.normalize(name);
          if(!n) return;
          if(!this.aliases[n]) this.aliases[n] = [];
          this.aliases[n].push(id);
        });
      });
    },

    buildRelationIndex(){
      this.relations = {};
      Object.entries(this.units).forEach(([id, unit]) => {
        this.relations[id] = unit.relations || {};
      });
    },

    search(query, limit = 8){
      const q = this.normalize(query);
      if(!q) return [];

      const tokens = q.split(" ").filter(t => t.length > 2);
      const scores = {};

      Object.entries(this.units).forEach(([id, unit]) => {
        const haystack = this.normalize(JSON.stringify(unit));
        let score = 0;

        tokens.forEach(token => {
          if(haystack.includes(token)) score += 1;
          if(this.normalize(unit.canonical_name || "").includes(token)) score += 3;
          if((unit.aliases || []).some(a => this.normalize(a).includes(token))) score += 3;
        });

        if(score > 0) scores[id] = score;
      });

      return Object.entries(scores)
        .sort((a,b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id, score]) => ({
          id,
          score,
          unit: this.units[id]
        }));
    },

    classify(text){
      const q = this.normalize(text);

      const domains = {
        clinical: ["paciente", "diagnostico", "conduta", "sintoma", "sinais", "exame", "tratamento", "fisiologia", "doenca", "dor", "febre", "dispneia"],
        document: ["documento", "prova", "processo", "pdf", "peticao", "relatorio", "linha do tempo", "evidencia", "anexo"],
        code: ["html", "css", "javascript", "github", "netlify", "deploy", "branch", "codigo", "engine", "script"],
        temporal: ["tempo", "clock", "data", "validade", "cache", "limpar", "memoria", "checkpoint", "evento"],
        semantic: ["significado", "conceito", "semantica", "linguagem", "alias", "relacao", "contexto", "traducao"]
      };

      const hits = {};
      Object.entries(domains).forEach(([domain, terms]) => {
        hits[domain] = terms.filter(term => q.includes(this.normalize(term))).length;
      });

      const ranked = Object.entries(hits).sort((a,b) => b[1] - a[1]);
      const best = ranked[0];

      return {
        input: text,
        normalized: q,
        domain: best && best[1] > 0 ? best[0] : "general",
        confidence: best ? Math.min(1, best[1] / 4) : 0,
        hits,
        semantic_matches: this.search(text, 5)
      };
    },

    prepareForAIGAR(text){
      const classification = this.classify(text);
      return {
        original_input: text,
        csi_version: this.version,
        intent_domain: classification.domain,
        confidence: classification.confidence,
        semantic_matches: classification.semantic_matches.map(m => ({
          id: m.id,
          canonical_name: m.unit.canonical_name || m.id,
          definition: m.unit.definition || "",
          score: m.score
        })),
        routing_hint: this.routingHint(classification.domain),
        instruction: "Send this interpreted semantic packet to Library-router and AIGAR-engine."
      };
    },

    routingHint(domain){
      const map = {
        clinical: "/Engines/Aurora/Bibliotecas/Fisiologia/index.json",
        document: "/Engines/Aurora/Bibliotecas/Documentos/index.json",
        code: "/Engines/Aurora/",
        temporal: "/Time/time-core.json",
        semantic: "/Engines/Aurora/CSI-engine/csi.json",
        general: "/Engines/Aurora/"
      };
      return map[domain] || map.general;
    },

    explain(text){
      const packet = this.prepareForAIGAR(text);
      const lines = [
        "CSI Engine — leitura semântica",
        "",
        "Domínio detectado: " + packet.intent_domain,
        "Confiança: " + Math.round(packet.confidence * 100) + "%",
        "Rota sugerida: " + packet.routing_hint,
        "",
        "Conceitos CSI relacionados:"
      ];

      if(packet.semantic_matches.length){
        packet.semantic_matches.forEach(m => {
          lines.push("- " + m.id + " — " + m.canonical_name);
        });
      }else{
        lines.push("- nenhum conceito direto detectado");
      }

      return lines.join("\n");
    }
  };

  window.CSIEngine = CSIEngine;
})();
