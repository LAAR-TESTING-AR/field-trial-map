(function () {
  "use strict";

  function limpiarVisor() {
    const visor = document.getElementById("fieldHistoryPhotoViewer");

    if (visor) {
      const imagen = visor.querySelector("img");
      if (imagen) imagen.removeAttribute("src");
      visor.remove();
    }

    document.body.classList.remove("field-history-viewer-open");
  }

  function abrirVisor(url, descripcion) {
    limpiarVisor();

    const visor = document.createElement("div");
    visor.id = "fieldHistoryPhotoViewer";
    visor.className = "field-photo-viewer-fondo";

    visor.innerHTML = `
      <div
        class="field-photo-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Vista ampliada de la fotografía histórica"
      >
        <button
          class="field-photo-viewer-cerrar"
          type="button"
          aria-label="Cerrar fotografía"
        >×</button>

        <img
          class="field-photo-viewer-imagen"
          src="${url}"
          alt="${descripcion}"
        >

        <p class="field-photo-viewer-ayuda">
          Tocá la X para volver al historial
        </p>
      </div>
    `;

    document.body.appendChild(visor);
    document.body.classList.add("field-history-viewer-open");

    visor
      .querySelector(".field-photo-viewer-cerrar")
      .addEventListener("click", evento => {
        evento.preventDefault();
        evento.stopPropagation();
        limpiarVisor();
      });

    visor.addEventListener("click", evento => {
      if (
        evento.target === visor ||
        evento.target.classList.contains("field-photo-viewer")
      ) {
        limpiarVisor();
      }
    });
  }

  document.addEventListener(
    "click",
    evento => {
      const boton = evento.target.closest(".field-history-foto");

      if (!boton) return;

      const url = String(boton.dataset.photoUrl || "").trim();
      if (!url) return;

      evento.preventDefault();
      evento.stopPropagation();
      evento.stopImmediatePropagation();

      const imagen = boton.querySelector("img");
      const descripcion =
        imagen?.getAttribute("alt") || "Fotografía histórica";

      abrirVisor(url, descripcion);
    },
    true
  );

  window.addEventListener("pagehide", limpiarVisor);

  console.log(
    "Visor interno del historial Field Photos preparado."
  );
})();
