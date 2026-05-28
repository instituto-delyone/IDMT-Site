/* =========================================================
   IDMT / Aurora Visual Engine v0.1
   Path: /Engines/Aurora/VISUAL-engine/visual-engine.js
   ========================================================= */

(function () {
  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("ve-page-enter");

    setupReveal();
    setupPortalLinks();
    autoEnhanceCards();
  });

  function setupReveal() {
    const candidates = [
      ".idmt-card",
      ".idmt-mini-card",
      ".idmt-engine-node",
      ".idmt-commercial-card",
      ".value",
      ".node"
    ];

    const elements = document.querySelectorAll(candidates.join(","));

    elements.forEach((el) => el.classList.add("ve-reveal"));

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("ve-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("ve-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    elements.forEach((el) => observer.observe(el));
  }

  function setupPortalLinks() {
    if (prefersReducedMotion) return;

    const overlay = document.createElement("div");
    overlay.className = "ve-portal-overlay";
    document.body.appendChild(overlay);

    const links = document.querySelectorAll("a.portal-zoom-link, a.ve-link, a[data-ve='portal']");

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        const target = link.getAttribute("target");

        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        if (target === "_blank") return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        event.preventDefault();

        const rect = link.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        overlay.style.setProperty("--ve-x", `${x}px`);
        overlay.style.setProperty("--ve-y", `${y}px`);

        overlay.classList.add("active");
        document.body.classList.add("ve-page-exit");

        window.setTimeout(() => {
          window.location.href = href;
        }, 430);
      });
    });
  }

  function autoEnhanceCards() {
    const cards = document.querySelectorAll(".idmt-card, .idmt-mini-card, .idmt-engine-node, .value");
    cards.forEach((card) => card.classList.add("ve-soft-card"));
  }
})();
