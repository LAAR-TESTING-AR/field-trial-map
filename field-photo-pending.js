(function () {
  "use strict";

  async function abrirPanelPendientes() {
    if (
      !window.FieldPhotoStorage ||
      typeof window.FieldPhotoStorage
        .obtenerFotosPendientes !== "function"
    ) {
      console.error(
        "El almacenamiento offline de Field Photos no está disponible."
      );

      return;
    }

    const registros =
      await window.FieldPhotoStorage
        .obtenerFotosPendientes();

    console.log(
      "Registros pendientes disponibles:",
      registros
    );
  }

  function conectarBotonPendientes() {
    const boton = document.getElementById(
      "pwaFotosPendientes"
    );

    if (!boton) {
      return false;
    }

    boton.addEventListener(
      "click",
      abrirPanelPendientes
    );

    console.log(
      "Botón de fotografías pendientes conectado."
    );

    return true;
  }

  function iniciar() {
    if (conectarBotonPendientes()) {
      return;
    }

    let intentos = 0;

    const temporizador = window.setInterval(
      () => {
        intentos += 1;

        if (
          conectarBotonPendientes() ||
          intentos >= 100
        ) {
          window.clearInterval(
            temporizador
          );
        }
      },
      100
    );
  }

  window.FieldPhotoPending = {
    abrirPanelPendientes
  };

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );
  } else {
    iniciar();
  }
})();
