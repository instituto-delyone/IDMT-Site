class LibraryRouter {
  constructor() {
    this.routes = {};
  }

  register(name, path) {
    this.routes[name] = path;
  }

  resolve(name) {
    return this.routes[name] || null;
  }

  list() {
    return Object.keys(this.routes);
  }
}

window.libraryRouter = new LibraryRouter();

window.libraryRouter.register(
  "fisiologia",
  "/Engines/Aurora/Bibliotecas/Fisiologia/"
);

window.libraryRouter.register(
  "tempo",
  "/TIME/"
);

console.log("Library-router online.");
