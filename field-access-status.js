(function () {
  "use strict";

  let renderToken = 0;

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function normalizar(valor) {
    return texto(valor).toLowerCase();
  }

  function esModoViewer() {
    return Boolean(
      window.FieldTrialAppMode &&
      window.FieldTrialAppMode.isViewer
    );
  }

  function obtenerPopupTrialAbierto() {
    return document.querySelector(
      ".leaflet-popup-content .popup-sitio.popup-trial"
    );
  }

  function obtenerAoiId(popup) {
    const boton = popup?.querySelector(
      '[data-field-coordinate-open="true"][data-aoi-id]'
    );

    if (boton?.dataset?.aoiId) {
      return texto(boton.dataset.aoiId);
    }

    const parrafos = popup?.querySelectorAll(
      ".popup-detalles > p"
    ) || [];

    for (const parrafo of parrafos) {
      const etiqueta = texto(
        parrafo.querySelector("strong")?.textContent
      )
        .replace(/:$/, "")
        .toLowerCase();

      if (etiqueta === "aoi id") {
        const copia = parrafo.cloneNode(true);
        copia.querySelector("strong")?.remove();
        return texto(copia.textContent);
      }
    }

    return "";
  }

  function coordenadaPublicada(popup) {
    const estadoAnterior = popup?.querySelector(
      ".field-access-progress"
    );

    if (!estadoAnterior) {
      return false;
    }

    return estadoAnterior.classList.contains(
      "field-access-status-ok"
    );
  }

  async function consultarCoordenadaPendiente(aoiId) {
    if (
      !window.FieldCoordinateStorage ||
      typeof window.FieldCoordinateStorage
        .tieneCoordenadaPendiente !== "function"
    ) {
      return false;
    }

    return window.FieldCoordinateStorage
      .tieneCoordenadaPendiente(aoiId, "Access");
  }

  async function consultarFotoPendiente(aoiId) {
    if (
      !window.FieldPhotoPending ||
      typeof window.FieldPhotoPending
        .obtenerEstadoPendienteAccess !== "function"
    ) {
      return {
        tieneRegistrosPendientes: false,
        tieneFotoPendiente: false,
        tieneComentarioPendiente: false,
        cantidadFotosPendientes: 0
      };
    }

    return window.FieldPhotoPending
      .obtenerEstadoPendienteAccess(aoiId);
  }

  async function consultarFotoPublicada(aoiId) {
    if (
      !window.FieldPhotoHistory ||
      typeof window.FieldPhotoHistory.obtenerFotos !== "function"
    ) {
      return {
        tieneFotoPublicada: false,
        tieneComentarioPublicado: false
      };
    }

    try {
      const fotos = await window.FieldPhotoHistory.obtenerFotos(
        aoiId,
        "Access"
      );

      return {
        tieneFotoPublicada: fotos.some(foto =>
          Boolean(texto(foto.publicPhotoUrl))
        ),
        tieneComentarioPublicado: fotos.some(foto =>
          Boolean(texto(foto.comments))
        )
      };
    } catch (error) {
      console.warn(
        "No fue posible consultar el historial publicado del Access:",
        error
      );

      return {
        tieneFotoPublicada: false,
        tieneComentarioPublicado: false
      };
    }
  }

  function crearLinea(icono, textoLinea, clase) {
    const linea = document.createElement("div");
    linea.className = `field-access-progress-line ${clase}`;

    const estado = document.createElement("span");
    estado.className = "field-access-progress-icon";
    estado.setAttribute("aria-hidden", "true");
    estado.textContent = icono;

    const etiqueta = document.createElement("span");
    etiqueta.textContent = textoLinea;

    linea.append(estado, etiqueta);
    return linea;
  }

  function crearBloqueEstado(estado) {
    const bloque = document.createElement("section");
    bloque.className = "field-access-progress";
    bloque.setAttribute("aria-label", "Estado del Access");

    if (estado.completo) {
      bloque.classList.add("field-access-progress-complete");
      bloque.appendChild(
        crearLinea(
          "✅",
          "Access completamente documentado",
          "field-access-progress-ok"
        )
      );
      return bloque;
    }

    const titulo = document.createElement("div");
    titulo.className = "field-access-progress-title";
    titulo.textContent = "Estado Access";
    bloque.appendChild(titulo);

    bloque.appendChild(
      crearLinea(
        estado.coordenadaDisponible ? "✅" : "⚠️",
        estado.coordenadaPendiente
          ? "Coordenada capturada, pendiente de sincronización"
          : estado.coordenadaPublicada
            ? "Coordenada sincronizada"
            : "Coordenada pendiente de captura",
        estado.coordenadaDisponible
          ? "field-access-progress-ok"
          : "field-access-progress-warning"
      )
    );

    bloque.appendChild(
      crearLinea(
        estado.fotoPendiente
          ? "⏳"
          : estado.fotoPublicada
            ? "✅"
            : "⚠️",
        estado.fotoPendiente
          ? "Fotografía pendiente de sincronización"
          : estado.fotoPublicada
            ? "Fotografía sincronizada"
            : "Fotografía pendiente de registro",
        estado.fotoPendiente
          ? "field-access-progress-pending"
          : estado.fotoPublicada
            ? "field-access-progress-ok"
            : "field-access-progress-warning"
      )
    );

    bloque.appendChild(
      crearLinea(
        estado.comentarioPendiente
          ? "⏳"
          : estado.comentarioPublicado
            ? "✅"
            : "⚠️",
        estado.comentarioPendiente
          ? "Comentario pendiente de sincronización"
          : estado.comentarioPublicado
            ? "Comentario sincronizado"
            : "Comentario pendiente de registro",
        estado.comentarioPendiente
          ? "field-access-progress-pending"
          : estado.comentarioPublicado
            ? "field-access-progress-ok"
            : "field-access-progress-warning"
      )
    );

    return bloque;
  }

  function insertarBloque(popup, bloque) {
    popup
      .querySelectorAll(".field-access-progress")
      .forEach(elemento => elemento.remove());

    const estadoAnterior = popup.querySelector(
      ".field-access-status"
    );

    if (estadoAnterior) {
      estadoAnterior.replaceWith(bloque);
      return;
    }

    const navegacion = popup.querySelector(
      ".botones-navegacion"
    );

    if (navegacion) {
      navegacion.parentNode.insertBefore(
        bloque,
        navegacion
      );
    } else {
      popup.appendChild(bloque);
    }
  }

  async function actualizarEstadoAccess() {
    if (esModoViewer()) {
      return;
    }

    const popup = obtenerPopupTrialAbierto();
    if (!popup) {
      return;
    }

    const aoiId = obtenerAoiId(popup);
    if (!aoiId) {
      return;
    }

    const tokenActual = ++renderToken;

    const coordenadaPublicadaActual =
      coordenadaPublicada(popup);

    const [
      coordenadaPendiente,
      estadoFotoPendiente,
      estadoPublicado
    ] = await Promise.all([
      consultarCoordenadaPendiente(aoiId),
      consultarFotoPendiente(aoiId),
      consultarFotoPublicada(aoiId)
    ]);

    if (tokenActual !== renderToken) {
      return;
    }

    const popupActual = obtenerPopupTrialAbierto();
    if (
      !popupActual ||
      normalizar(obtenerAoiId(popupActual)) !==
        normalizar(aoiId)
    ) {
      return;
    }

    const estado = {
      coordenadaPublicada: coordenadaPublicadaActual,
      coordenadaPendiente,
      coordenadaDisponible:
        coordenadaPublicadaActual || coordenadaPendiente,
      fotoPendiente:
        estadoFotoPendiente.tieneFotoPendiente,
      comentarioPendiente:
        estadoFotoPendiente.tieneComentarioPendiente,
      fotoPublicada:
        estadoPublicado.tieneFotoPublicada,
      comentarioPublicado:
        estadoPublicado.tieneComentarioPublicado
    };
if (!estado.coordenadaDisponible) {

  estado.fotoPendiente = false;
  estado.comentarioPendiente = false;

  estado.fotoPublicada = false;
  estado.comentarioPublicado = false;
}
    estado.completo = Boolean(
      estado.coordenadaPublicada &&
      !estado.coordenadaPendiente &&
      estado.fotoPublicada &&
      estado.comentarioPublicado &&
      !estado.fotoPendiente &&
      !estado.comentarioPendiente
    );

    insertarBloque(
      popupActual,
      crearBloqueEstado(estado)
    );
  }

  function programarActualizacion() {
    window.requestAnimationFrame(() => {
      actualizarEstadoAccess();
    });

    window.setTimeout(actualizarEstadoAccess, 120);
    window.setTimeout(actualizarEstadoAccess, 500);
  }

  if (
    typeof mapa !== "undefined" &&
    mapa &&
    typeof mapa.on === "function"
  ) {
    mapa.on("popupopen", programarActualizacion);
  }

  [
    "fieldcoordinates:pending-updated",
    "fieldphotos:pending-updated",
    "fieldphotos:history-updated"
  ].forEach(nombreEvento => {
    window.addEventListener(
      nombreEvento,
      programarActualizacion
    );
  });

  window.FieldAccessStatus = {
    actualizar: actualizarEstadoAccess
  };

  console.log(
    esModoViewer()
      ? "Modo consulta: estado operativo de Access oculto."
      : "Estado operativo de Access preparado."
  );
})();
