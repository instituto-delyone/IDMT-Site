/* =========================================================
   Library Router Engine v0.1
   Path: /Engines/Aurora/Library-router/library-router.js
   ========================================================= */

(function(){
  const LibraryRouter = {
    version: "0.1",
    loaded: false,
    indexes: {},
    registry: {
      fisiologia: {
        name: "Fisiologia",
        path: "/Engines/Aurora/Bibliotecas/Fisiologia/index.json",
        domain: "clinical"
      }
    },

    async init(){
      const entries = Object.entries(this.registry);
      for(const [key, item] of entries){
        try{
          const response = await fetch(item.path, {cache:"no-store"});
          if(!response.ok) continue;
          const data = await response.json();
          this.indexes[key] = data;
        }catch(error){
          console.warn("Library index not loaded:", key, error);
        }
      }

      this.loaded = Object.keys(this.indexes).length > 0;
      console.log("Library Router loaded:", Object.keys(this.indexes));
      return this;
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

    routeFromCSIPacket(packet){
      const domain = packet?.intent_domain || "general";

      if(domain === "clinical"){
        return this.search("fisiologia", packet.original_input || "", 6);
      }

      if(domain === "temporal"){
        return {
          library: "Time",
          route: "/Time/time-core.json",
          reason: "Temporal request routed to Time Engine."
        };
      }

      if(domain === "semantic"){
        return {
          library: "CSI",
          route: "/Engines/Aurora/CSI-engine/csi.json",
          reason: "Semantic request routed to CSI Engine."
        };
      }

      return this.search("fisiologia", packet?.original_input || "", 4);
    },

    search(libraryKey, query, limit = 6){
      const index = this.indexes[libraryKey];
      if(!index){
        return {
          library: libraryKey,
          found: false,
          message: "Library index not loaded.",
          candidates: []
        };
      }

      const q = this.normalize(query);
      const tokens = q.split(" ").filter(t => t.length > 2);
      const chunks = index.chunks || [];

      const scored = chunks.map(chunk => {
        const hay = this.normalize([
          chunk.id,
          chunk.part_id,
          chunk.source_pdf_current_name,
          chunk.source_pdf_recommended_name,
          (chunk.keywords || []).join(" "),
          (chunk.headings_detected || []).join(" "),
          chunk.load_instruction
        ].join(" "));

        let score = 0;
        tokens.forEach(t => {
          if(hay.includes(t)) score += 1;
          (chunk.keywords || []).forEach(k => {
            if(this.normalize(k).includes(t) || t.includes(this.normalize(k))) score += 2;
          });
          (chunk.headings_detected || []).forEach(h => {
            if(this.normalize(h).includes(t)) score += 3;
          });
        });

        return {score, chunk};
      })
      .filter(item => item.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, limit);

      return {
        library: index.library || libraryKey,
        found: scored.length > 0,
        query,
        candidates: scored.map(item => ({
          score: item.score,
          id: item.chunk.id,
          file: item.chunk.file,
          part_id: item.chunk.part_id,
          pdf_current: item.chunk.source_pdf_current_name,
          pdf_recommended: item.chunk.source_pdf_recommended_name,
          page_start: item.chunk.page_start,
          page_end: item.chunk.page_end,
          keywords: item.chunk.keywords || [],
          headings_detected: item.chunk.headings_detected || [],
          instruction: item.chunk.load_instruction
        }))
      };
    },

    explainRoute(route){
      if(!route) return "Library Router: nenhuma rota.";

      if(route.candidates && route.candidates.length){
        const lines = [
          "Library Router — candidatos encontrados",
          "",
          "Biblioteca: " + route.library,
          "Consulta: " + route.query,
          ""
        ];

        route.candidates.forEach(c => {
          lines.push(
            "- " + c.id +
            " | " + c.part_id +
            " | páginas " + c.page_start + "-" + c.page_end +
            " | score " + c.score
          );
        });

        return lines.join("\n");
      }

      if(route.route){
        return "Library Router — rota direta\n\n" + route.library + " → " + route.route;
      }

      return "Library Router: nenhum chunk candidato encontrado.";
    },

    prepareContext(route){
      if(!route || !route.candidates || !route.candidates.length){
        return {
          status: "empty",
          instruction: "No candidate chunk found."
        };
      }

      return {
        status: "ready",
        source_library: route.library,
        candidate_count: route.candidates.length,
        candidates: route.candidates,
        instruction: "AIGAR should use these chunk pointers to request or load the relevant PDF pages."
      };
    }
  };

  window.LibraryRouter = LibraryRouter;
})();
