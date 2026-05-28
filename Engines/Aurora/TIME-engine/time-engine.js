/* Time Engine v0.1 — contextual clock */
(function(){
  const TimeEngine = {
    now: function(){
      return new Date();
    },

    stamp: function(label){
      return {
        label: label || "event",
        iso: new Date().toISOString(),
        epoch_ms: Date.now()
      };
    },

    ageInDays: function(isoDate){
      const then = new Date(isoDate).getTime();
      if(Number.isNaN(then)) return null;
      return Math.floor((Date.now() - then) / 86400000);
    },

    classifyAge: function(isoDate){
      const age = this.ageInDays(isoDate);
      if(age === null) return "unknown";
      if(age <= 7) return "active";
      if(age <= 30) return "warm";
      if(age <= 180) return "cold";
      return "expired";
    },

    explain: function(){
      return "Time Engine ativo: regula idade, prioridade, cache, limpeza e consolidação contextual.";
    }
  };

  window.TimeEngine = TimeEngine;
})();
