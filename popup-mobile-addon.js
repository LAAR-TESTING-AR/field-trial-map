(function () {
  "use strict";

  const ETIQUETAS_SECUNDARIAS = [
    "Operación",
    "Estación",
    "SPA",
    "Número de plots SPD",
    "Estado LAAR 2026-2027",
    "Cultivo antecesor",
    "Densidad de plantas",
    "Fertilización",
    "Área",
    "Latitud",
    "Longitud"
  ];


  function esIOSStandalone() {
    const esIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const esStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    return esIOS && esStandalone;
  }

  function actualizarAlturaVisiblePWA() {
    if (!esIOSStandalone()) {
      document.documentElement.classList.remove("ios-pwa-standalone");
      document.documentElement.style.removeProperty("--ios-pwa-visible-height");
      return;
    }

    const alturaVisible = Math.round(
      window.visualViewport?.height || window.innerHeight
    );

    document.documentElement.classList.add("ios-pwa-standalone");
    document.documentElement.style.setProperty(
      "--ios-pwa-visible-height",
      `${alturaVisible}px`
    );
  }

  function ajustarPopupIOSPWA() {
    if (!esIOSStandalone()) return;

    actualizarAlturaVisiblePWA();

    const contenido = document.querySelector(
      ".leaflet-popup-content"
    );

    if (!contenido) return;

    contenido.scrollTop = 0;

    window.setTimeout(() => {
      const popup =
        typeof mapa !== "undefined" && mapa
          ? mapa._popup
          : null;

      if (
        popup &&
        typeof popup.update === "function"
      ) {
        popup.update();
      }

      if (
        popup &&
        typeof mapa.panInsidePopup === "function"
      ) {
        mapa.panInsidePopup(popup, {
          paddingTopLeft: [18, 18],
          paddingBottomRight: [18, 80]
        });
      }
    }, 50);
  }

  function textoEtiqueta(parrafo) {
    const strong = parrafo.querySelector("strong");
    return strong ? strong.textContent.replace(":", "").trim() : "";
  }

  function prepararPopupTrial(popup) {
    if (!popup || popup.classList.contains("popup-movil-preparado")) return;
    if (popup.classList.contains("popup-access")) return;

    const detalles = popup.querySelector(".popup-detalles");
    if (!detalles) return;

    const secundarios = Array.from(
      detalles.querySelectorAll(":scope > p")
    ).filter(parrafo =>
      ETIQUETAS_SECUNDARIAS.includes(textoEtiqueta(parrafo))
    );

    if (secundarios.length) {
      const desplegable = document.createElement("details");
      desplegable.className = "detalles-adicionales-trial";

      const resumen = document.createElement("summary");
      resumen.textContent = "Ver más información";
      desplegable.appendChild(resumen);

      const contenido = document.createElement("div");
      contenido.className = "contenido-adicional-trial";

      secundarios.forEach(parrafo => contenido.appendChild(parrafo));
      desplegable.appendChild(contenido);
      detalles.appendChild(desplegable);
    }

    popup.classList.add("popup-movil-preparado");
  }

  function prepararPopupAccess(popup) {
    if (!popup || !popup.classList.contains("popup-access")) return;

    /*
      Conserva la última miniatura como referencia visual.
      Si una versión anterior todavía la envolvió en un enlace,
      reemplaza el enlace por la imagen para impedir que sea clickeable.
    */
    popup.querySelectorAll(".enlace-miniatura-access").forEach(enlace => {
      const miniatura = enlace.querySelector(".miniatura-access");

      if (miniatura) {
        enlace.replaceWith(miniatura);
      } else {
        enlace.remove();
      }
    });

    /* El historial es el único lugar desde el cual se amplían las fotos. */
    popup.querySelectorAll(".boton-ver-foto-access")
      .forEach(boton => boton.remove());

    popup.querySelectorAll(".fila-botones-foto").forEach(fila => {
      if (!fila.children.length) fila.remove();
    });
  }

  function prepararPopupAbierto() {
    const popup = document.querySelector(
      ".leaflet-popup-content .popup-sitio"
    );

    if (!popup) return;

    if (popup.classList.contains("popup-access")) {
      prepararPopupAccess(popup);
    } else {
      prepararPopupTrial(popup);
    }
  }

  if (
    typeof mapa === "undefined" ||
    !mapa ||
    typeof mapa.on !== "function"
  ) {
    console.error("popup-mobile-addon.js debe cargarse después de app.js.");
    return;
  }

  mapa.on("popupopen", function () {
    actualizarAlturaVisiblePWA();

    window.requestAnimationFrame(() => {
      prepararPopupAbierto();
      ajustarPopupIOSPWA();
    });

    window.setTimeout(() => {
      prepararPopupAbierto();
      ajustarPopupIOSPWA();
    }, 80);

    window.setTimeout(() => {
      prepararPopupAbierto();
      ajustarPopupIOSPWA();
    }, 250);

    window.setTimeout(ajustarPopupIOSPWA, 600);
  });

  window.addEventListener("resize", actualizarAlturaVisiblePWA);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(actualizarAlturaVisiblePWA, 150);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      "resize",
      actualizarAlturaVisiblePWA
    );
  }

  actualizarAlturaVisiblePWA();

  console.log("Optimización móvil de popups habilitada.");
})();
