(function () {
  "use strict";

  let historialAbierto = null;
  let renderEnCurso = false;
  let renderPendiente = false;

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
    if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(fecha);
  }

  function formatearFechaBreve(valor) {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "Sin fecha";
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit", month: "2-digit"
    }).format(fecha);
  }

  function etiquetaScore(score) {
    const valor = Number(score);
    if (valor === 9) return "Excelente";
    if (valor === 8) return "Muy bueno";
    if (valor === 7) return "Bueno";
    if (valor === 6) return "Aceptable";
    if (valor === 5 || valor === 4) return "Cuestionable";
    if (valor >= 1 && valor <= 3) return "Descartable";
    return "Sin evaluar";
  }

  function abrirFoto(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function crearTarjetaVisita(visita, indice) {
    const tarjeta = document.createElement("article");
    tarjeta.id = `fieldHistoryVisit-${indice}`;
    tarjeta.className = "field-history-visita";

    const esAccess = texto(visita.photoType).toLowerCase() === "access";
    const claseTipo = esAccess
      ? "field-history-tipo field-history-tipo-access"
      : "field-history-tipo";
    const score = Number(visita.visitScore);
    const scoreValido = Number.isInteger(score) && score >= 1 && score <= 9;

    const fotosHTML = visita.photos
      .filter(foto => texto(foto.publicPhotoUrl))
      .map((foto, fotoIndice) => `
        <button class="field-history-foto" type="button"
          data-photo-url="${escaparHTML(foto.publicPhotoUrl)}"
          aria-label="Ver fotografía ${fotoIndice + 1}">
          <img src="${escaparHTML(foto.publicPhotoUrl)}"
            alt="Fotografía ${fotoIndice + 1} de ${escaparHTML(visita.location)}"
            loading="lazy">
          <span>${foto.photoOrder || fotoIndice + 1}</span>
        </button>
      `).join("");

    tarjeta.innerHTML = `
      <div class="field-history-visita-cabecera">
        <span class="${claseTipo}">${escaparHTML(visita.photoType || "Foto")}</span>
        <span class="field-history-fecha">${escaparHTML(formatearFecha(visita.captureDate))}</span>
      </div>
      ${scoreValido
        ? `<p class="field-history-estadio">Score: ${score} · ${escaparHTML(etiquetaScore(score))}</p>`
        : `<p class="field-history-estadio">Score: Sin evaluar</p>`}
      ${visita.cropStage
        ? `<p class="field-history-estadio">Estadio: ${escaparHTML(visita.cropStage)}</p>`
        : ""}
      ${visita.comments
        ? `<p class="field-history-comentario">${escaparHTML(visita.comments)}</p>`
        : ""}
      <div class="field-history-galeria">${fotosHTML}</div>
    `;

    tarjeta.querySelectorAll(".field-history-foto").forEach(boton => {
      boton.addEventListener("click", () => abrirFoto(boton.dataset.photoUrl));
    });
    return tarjeta;
  }

  function crearLineaTiempo(visitas, crop) {
    const contenedor = document.createElement("section");
    contenedor.className = "field-timeline-section";
    contenedor.setAttribute("aria-label", "Línea de tiempo del Trial");

    const titulo = document.createElement("h3");
    titulo.className = "field-timeline-title";
    titulo.textContent = "Línea de tiempo del Trial";
    contenedor.appendChild(titulo);

    const desplazable = document.createElement("div");
    desplazable.className = "field-timeline-scroll";
    const linea = document.createElement("div");
    linea.className = "field-timeline-line";

    [...visitas].reverse().forEach(visita => {
      const indiceOriginal = visitas.indexOf(visita);
      const score = Number(visita.visitScore);
      const scoreValido = Number.isInteger(score) && score >= 1 && score <= 9;
      const color = window.FieldPhotoHistory.colorScore(scoreValido ? score : null);
      const hito = document.createElement("button");
      hito.className = "field-timeline-milestone";
      hito.type = "button";
      hito.setAttribute("aria-label",
        `${formatearFecha(visita.captureDate)}, ${visita.cropStage || "sin estadio"}, ${scoreValido ? `score ${score}` : "sin evaluar"}`);
      hito.innerHTML = `
        <span class="field-timeline-date">${escaparHTML(formatearFechaBreve(visita.captureDate))}</span>
        <span class="field-timeline-icon-wrap" style="--timeline-color: ${escaparHTML(color)};">
          ${window.FieldPhotoTimelineIcons.obtenerIcono(crop, {
            color,
            titulo: `${crop || "Cultivo"}, score ${scoreValido ? score : "sin evaluar"}`
          })}
        </span>
        <span class="field-timeline-score" data-score="${scoreValido ? score : "–"}">SC ${scoreValido ? score : "–"}</span>
        <span class="field-timeline-score-label">${escaparHTML(scoreValido ? etiquetaScore(score) : "Sin evaluar")}</span>
        <span class="field-timeline-stage" data-stage="${escaparHTML(visita.cropStage || "Sin estadio")}">
          Estadio ${escaparHTML(visita.cropStage || "Sin estadio")}
        </span>`;

      hito.addEventListener("click", () => {
        const tarjeta = document.getElementById(`fieldHistoryVisit-${indiceOriginal}`);
        if (!tarjeta) return;
        document.querySelectorAll(".field-history-visita-destacada").forEach(elemento => {
          elemento.classList.remove("field-history-visita-destacada");
        });
        tarjeta.classList.add("field-history-visita-destacada");
        tarjeta.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => tarjeta.classList.remove("field-history-visita-destacada"), 2200);
      });
      linea.appendChild(hito);
    });

    desplazable.appendChild(linea);
    contenedor.appendChild(desplazable);
    return contenedor;
  }

  async function renderizarHistorialAbierto() {
    if (!historialAbierto || renderEnCurso) {
      if (renderEnCurso) renderPendiente = true;
      return;
    }

    const fondo = document.getElementById("fieldHistoryModal");
    const lista = fondo?.querySelector("#fieldHistoryLista");
    if (!fondo || !lista) {
      historialAbierto = null;
      return;
    }

    renderEnCurso = true;
    const { aoiId, photoType, crop } = historialAbierto;

    try {
      const visitas = await window.FieldPhotoHistory.obtenerVisitas(aoiId, photoType);
      if (!document.body.contains(fondo)) return;
      lista.replaceChildren();

      if (!visitas.length) {
        const vacio = document.createElement("div");
        vacio.className = "field-history-vacio";
        vacio.textContent = photoType.toLowerCase() === "trial"
          ? "Todavía no hay visitas sincronizadas para este Trial."
          : "Todavía no hay fotografías sincronizadas para este Access.";
        lista.appendChild(vacio);
        return;
      }

      if (
        photoType.toLowerCase() === "trial" &&
        window.FieldPhotoTimelineIcons &&
        typeof window.FieldPhotoTimelineIcons.obtenerIcono === "function"
      ) {
        lista.appendChild(crearLineaTiempo(visitas, crop));
      }

      visitas.forEach((visita, indice) => {
        lista.appendChild(crearTarjetaVisita(visita, indice));
      });
    } catch (error) {
      console.error("No fue posible actualizar el historial:", error);
      lista.innerHTML = `<div class="field-history-error">No fue posible actualizar el historial. Volvé a intentarlo con conexión.</div>`;
    } finally {
      renderEnCurso = false;
      if (renderPendiente) {
        renderPendiente = false;
        renderizarHistorialAbierto();
      }
    }
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
    if (!window.FieldPhotoHistory || typeof window.FieldPhotoHistory.obtenerVisitas !== "function") {
      window.alert("El historial de fotografías no está disponible.");
      return;
    }

    document.getElementById("fieldHistoryModal")?.remove();
    historialAbierto = { aoiId, location, crop, photoType };

    const fondo = document.createElement("div");
    fondo.id = "fieldHistoryModal";
    fondo.className = "field-history-modal-fondo";
    fondo.innerHTML = `
      <section class="field-history-modal" role="dialog" aria-modal="true" aria-labelledby="fieldHistoryTitulo">
        <button class="field-history-cerrar" type="button" aria-label="Cerrar historial">×</button>
        <h2 id="fieldHistoryTitulo">${photoType.toLowerCase() === "trial" ? "Historial de visitas" : "Historial de fotografías del Access"}</h2>
        <p class="field-history-contexto">
          <strong>${escaparHTML(location || "Localidad")}</strong>
          · AOI ID: ${escaparHTML(aoiId)}
          ${crop ? ` · ${escaparHTML(crop)}` : ""}
        </p>
        <div id="fieldHistoryLista" class="field-history-lista">
          <div class="field-history-cargando">Cargando historial...</div>
        </div>
        <div class="field-history-pie">
          <button type="button" class="field-history-cerrar-pie">Cerrar</button>
        </div>
      </section>`;

    document.body.appendChild(fondo);
    document.body.style.overflow = "hidden";

    const cerrar = () => {
      historialAbierto = null;
      fondo.remove();
      document.body.style.overflow = "";
    };
    fondo.querySelector(".field-history-cerrar").addEventListener("click", cerrar);
    fondo.querySelector(".field-history-cerrar-pie").addEventListener("click", cerrar);
    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) cerrar();
    });

    await renderizarHistorialAbierto();
  }

  window.addEventListener("fieldphotos:history-updated", () => {
    if (historialAbierto) {
      renderizarHistorialAbierto();
    }
  });

  window.FieldPhotoHistoryUI = {
    abrirHistorial,
    actualizarHistorialAbierto: renderizarHistorialAbierto
  };

  console.log("Interfaz del historial con actualización automática preparada.");
})();
