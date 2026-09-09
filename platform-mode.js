(function () {
  "use strict";

  const parametros =
    new URLSearchParams(
      window.location.search
    );

  const esViewer =
    parametros.get("mode") === "viewer";

  window.FieldTrialPlatformMode = {
    isViewer: esViewer,
    isEditor: !esViewer
  };

  document.documentElement.classList.toggle(
    "platform-viewer-mode",
    esViewer
  );

  document.documentElement.classList.toggle(
    "platform-editor-mode",
    !esViewer
  );

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      if (!esViewer) {
        return;
      }

      /*
       * Conserva mode=viewer al ingresar
       * a Master List.
       */
      const enlaceMasterList =
        document.querySelector(
          'a[href="index.html"]'
        );

      if (enlaceMasterList) {
        enlaceMasterList.href =
          "index.html?mode=viewer";
      }

      /*
       * Conserva mode=viewer al ingresar
       * a Sowing.
       */
      const enlaceSowing =
        document.querySelector(
          'a[href="planting/"]'
        );

      if (enlaceSowing) {
        enlaceSowing.href =
          "planting/?mode=viewer";
      }

      /*
       * Identificación visible del modo.
       */
      const barraEstado =
        document.querySelector(
          ".platform-status-bar"
        );

      if (barraEstado) {

        const indicador =
          document.createElement("div");

        indicador.className =
          "platform-viewer-badge";

        indicador.textContent =
          "VIEWER · SOLO CONSULTA";

        barraEstado.prepend(
          indicador
        );
      }

      /*
       * En Viewer no mostramos instalación,
       * porque el acceso está pensado como
       * vínculo de consulta controlado.
       */
      const instalar =
        document.getElementById(
          "installAppBtn"
        );

      if (instalar) {
        instalar.hidden = true;
      }

    }
  );

  console.log(
    esViewer
      ? "Field Trial Platform: modo Viewer."
      : "Field Trial Platform: modo operativo."
  );

})();
