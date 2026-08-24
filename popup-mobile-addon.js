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

  function textoEtiqueta(parrafo) {
    const strong = parrafo.querySelector("strong");
    return strong ? strong.textContent.replace(":", "").trim() : "";
  }

  function prepararPopupTrial(popup) {
    if (!popup || popup.classList.contains("popup-movil-preparado")) return;
    if (popup.classList.contains("popup-access")) return;

    const detalles = popup.querySelector(".popup-detalles");
    if (!detalles) return;

    const secundarios = Array.from(detalles.querySelectorAll(":scope > p"))
      .filter(parrafo => ETIQUETAS_SECUNDARIAS.includes(textoEtiqueta(parrafo)));

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

    /* La foto completa continúa disponible mediante el botón.
       Se elimina cualquier miniatura incrustada para evitar fallas de SharePoint. */
    popup.querySelectorAll(".enlace-miniatura-access, .miniatura-access")
      .forEach(elemento => elemento.remove());

    const botonVer = popup.querySelector(".boton-ver-foto-access");
    if (botonVer) {
      botonVer.innerHTML = '<span aria-hidden="true">🖼️</span> Ver última foto';
    }
  }

  function prepararPopupAbierto() {
    const popup = document.querySelector(".leaflet-popup-content .popup-sitio");
    if (!popup) return;

    if (popup.classList.contains("popup-access")) {
      prepararPopupAccess(popup);
    } else {
      prepararPopupTrial(popup);
    }
  }

  if (typeof mapa === "undefined" || !mapa || typeof mapa.on !== "function") {
    console.error("popup-mobile-addon.js debe cargarse después de app.js.");
    return;
  }

  mapa.on("popupopen", function () {
    /* Leaflet termina de insertar el contenido inmediatamente después del evento. */
    window.requestAnimationFrame(prepararPopupAbierto);
    window.setTimeout(prepararPopupAbierto, 80);
  });

  console.log("Optimización móvil de popups habilitada.");
})();
