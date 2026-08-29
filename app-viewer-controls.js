(function () {
  "use strict";

  const esModoViewer = Boolean(
    window.FieldTrialAppMode &&
    window.FieldTrialAppMode.isViewer
  );

  if (!esModoViewer) {
    console.log("Controles de edición habilitados: modo FULL.");
    return;
  }

  const IDS_CONTROLES_ESCRITURA = [
    "pwaFotosPendientes",
    "fieldCoordinatePendingButton"
  ];

  function ocultarControlesEscritura() {
    IDS_CONTROLES_ESCRITURA.forEach(id => {
      const elemento = document.getElementById(id);

      if (!elemento) return;

      elemento.hidden = true;
      elemento.style.setProperty("display", "none", "important");
      elemento.setAttribute("aria-hidden", "true");
      elemento.setAttribute("tabindex", "-1");
    });
  }

  function bloquearAccionesEscritura(evento) {
    const control = evento.target.closest(
      [
        '[data-field-photo-open="true"]',
        '[data-field-coordinate-open="true"]',
        "#pwaFotosPendientes",
        "#fieldCoordinatePendingButton",
        "[data-field-coordinate-sync-button]",
        "[data-field-coordinate-sync-configure]"
      ].join(",")
    );

    if (!control) return;

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();
  }

  document.addEventListener(
    "click",
    bloquearAccionesEscritura,
    true
  );

  function iniciar() {
    ocultarControlesEscritura();

    let intentos = 0;
    const maximoIntentos = 100;

    const temporizador = window.setInterval(() => {
      intentos += 1;
      ocultarControlesEscritura();

      if (intentos >= maximoIntentos) {
        window.clearInterval(temporizador);
      }
    }, 100);

    window.addEventListener(
      "fieldphotos:pending-updated",
      ocultarControlesEscritura
    );

    window.addEventListener(
      "fieldcoordinates:pending-updated",
      ocultarControlesEscritura
    );

    console.log(
      "Modo VIEWER: controles de captura, pendientes y sincronización ocultos."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, {
      once: true
    });
  } else {
    iniciar();
  }

  window.FieldTrialViewerMode = {
    ocultarControlesEscritura
  };
})();
