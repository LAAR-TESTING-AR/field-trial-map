(function () {
  "use strict";

  const parametros = new URLSearchParams(window.location.search);

  const modoViewer =
    parametros.get("mode") === "viewer";

  window.FieldTrialAppMode = {
    mode: modoViewer ? "viewer" : "full",

    isViewer: modoViewer,

    isFull: !modoViewer
  };

  console.log(
    `Modo de aplicación: ${
      modoViewer ? "VIEWER" : "FULL"
    }`
  );
})();
