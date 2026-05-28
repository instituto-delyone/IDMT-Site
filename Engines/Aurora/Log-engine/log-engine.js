/* =========================================================
   Log Engine v0.1
   Memória voluntária: só consolida quando o usuário manda.
   Path: /Engines/Aurora/Log-engine/log-engine.js
   ========================================================= */

(function(){
  const KEY = "AIGAR_CONSOLIDATED_LOGS_V01";

  const LogEngine = {
    version: "0.1",

    read(){
      try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
      catch(e){ return []; }
    },

    write(items){
      localStorage.setItem(KEY, JSON.stringify(items));
      return items;
    },

    save(entry){
      const items = this.read();
      const saved = {
        id: "log_" + Date.now(),
        created_at: new Date().toISOString(),
        ...entry
      };
      items.push(saved);
      this.write(items);
      return saved;
    },

    saveCurrentSession(){
      const memory = window.MemoryEngine ? MemoryEngine.read() : [];
      const saved = this.save({
        type: "manual_reasoning_log",
        title: "Raciocínio consolidado manualmente",
        memory_snapshot: memory,
        note: "Registro criado por ação explícita do usuário."
      });
      return saved;
    },

    exportJSON(){
      return JSON.stringify(this.read(), null, 2);
    },

    download(){
      const blob = new Blob([this.exportJSON()], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aigar_logs_" + new Date().toISOString().slice(0,10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
    },

    count(){
      return this.read().length;
    }
  };

  window.LogEngine = LogEngine;
})();
