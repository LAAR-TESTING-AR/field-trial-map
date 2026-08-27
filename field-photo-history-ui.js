(function () {
  "use strict";

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function escaparHTML(valor) {
    return texto(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatearFecha(valor) {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(fecha);
  }

  function abrirFoto(url, descripcion) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function crearTarjetaVisita(visita) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "field-history-visita";

    const esAccess =
      texto(visita.photoType).toLowerCase() === "access";

    const claseTipo = esAccess
      ? "field-history-tipo field-history-tipo-access"
      : "field-history-tipo";

    const fotosHTML = visita.photos
      .filter(foto => texto(foto.publicPhotoUrl))
      .map(
        (foto, indice) => `
          <button
            class="field-history-foto"
            type="button"
            data-photo-url="${escaparHTML(foto.publicPhotoUrl)}"
            data-photo-description="Fotografía ${indice + 1} de ${escaparHTML(visita.location)}"
            aria-label="Ver fotografía ${indice + 1}"
          >
            <img
              src="${escaparHTML(foto.publicPhotoUrl)}"
              alt="Fotografía ${indice + 1} de ${escaparHTML(visita.location)}"
              loading="lazy"
            >
            <span>${foto.photoOrder || indice + 1}</span>
          </button>
        `
      )
      .join("");

    tarjeta.innerHTML = `
      <div class="field-history-visita-cabecera">
        <span class="${claseTipo}">
          ${escaparHTML(visita.photoType || "Foto")}
        </span>

        <span class="field-history-fecha">
          ${escaparHTML(formatearFecha(visita.captureDate))}
        </span>
      </div>

      ${
        visita.cropStage
          ? `<p class="field-history-estadio">
              Estadio: ${escaparHTML(visita.cropStage)}
            </p>`
          : ""
      }

      ${
        visita.comments
          ? `<p class="field-history-comentario">
              ${escaparHTML(visita.comments)}
            </p>`
          : ""
      }

      <div class="field-history-galeria">
        ${fotosHTML}
      </div>
    `;

    tarjeta
      .querySelectorAll(".field-history-foto")
      .forEach(boton => {
        boton.addEventListener("click", () => {
          abrirFoto(
            boton.dataset.photoUrl,
            boton.dataset.photoDescription
          );
        });
      });

    return tarjeta;
  }

  async function abrirHistorial(configuracion = {}) {
    const aoiId = texto(configuracion.aoiId);
    const location = texto(configuracion.location);
    const crop = texto(configuracion.crop);
    const photoType = texto(configuracion.photoType || "Trial");

    if (!aoiId) {
      window.alert("No se encontró el AOI ID del sitio.");
      return;
    }

    if (
      !window.FieldPhotoHistory ||
      typeof window.FieldPhotoHistory.obtenerVisitas !== "function"
    ) {
      window.alert("El historial de fotografías no está disponible.");
      return;
    }

    document.getElementById("fieldHistoryModal")?.remove();

    const fondo = document.createElement("div");
    fondo.id = "fieldHistoryModal";
    fondo.className = "field-history-modal-fondo";

    fondo.innerHTML = `
      <section
        class="field-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fieldHistoryTitulo"
      >
        <button
          class="field-history-cerrar"
          type="button"
          aria-label="Cerrar historial"
        >×</button>

        <h2 id="fieldHistoryTitulo">
          ${photoType.toLowerCase() === "trial"
            ? "Historial de visitas"
            : "Historial de fotografías del Access"}
        </h2>

        <p class="field-history-contexto">
          <strong>${escaparHTML(location || "Localidad")}</strong>
          · AOI ID: ${escaparHTML(aoiId)}
          ${crop ? ` · ${escaparHTML(crop)}` : ""}
        </p>

        <div id="fieldHistoryLista" class="field-history-lista">
          <div class="field-history-cargando">
            Cargando historial...
          </div>
        </div>

        <div class="field-history-pie">
          <button type="button" class="field-history-cerrar-pie">
            Cerrar
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(fondo);
    document.body.style.overflow = "hidden";

    const cerrar = () => {
      fondo.remove();
      document.body.style.overflow = "";
    };

    fondo
      .querySelector(".field-history-cerrar")
      .addEventListener("click", cerrar);

    fondo
      .querySelector(".field-history-cerrar-pie")
      .addEventListener("click", cerrar);

    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) {
        cerrar();
      }
    });

    const lista = fondo.querySelector("#fieldHistoryLista");

    try {
      const visitas = await window.FieldPhotoHistory.obtenerVisitas(
        aoiId,
        photoType
      );

      lista.replaceChildren();

      if (!visitas.length) {
        const vacio = document.createElement("div");
        vacio.className = "field-history-vacio";
        vacio.textContent =
          photoType.toLowerCase() === "trial"
            ? "Todavía no hay visitas sincronizadas para este Trial."
            : "Todavía no hay fotografías sincronizadas para este Access.";
        lista.appendChild(vacio);
        return;
      }

      visitas.forEach(visita => {
        lista.appendChild(crearTarjetaVisita(visita));
      });
    } catch (error) {
      console.error("No fue posible abrir el historial:", error);

      lista.innerHTML = `
        <div class="field-history-error">
          No fue posible cargar el historial. Volvé a intentarlo con conexión.
        </div>
      `;
    }
  }

  window.FieldPhotoHistoryUI = {
    abrirHistorial
  };

  console.log("Interfaz del historial Field Photos preparada.");
})();
