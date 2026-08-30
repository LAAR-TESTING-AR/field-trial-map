(function () {
  "use strict";

  const ARCHIVO_FOTOS = "AccessPhotos.csv";
  let fotosAccess = [];

  const limpiar = valor => String(valor ?? "").trim();
  const normalizarId = valor => limpiar(valor).toLowerCase();

  function textoSinHTML(valor) {
    const contenedor = document.createElement("div");
    contenedor.innerHTML = limpiar(valor);
    return limpiar(
      contenedor.textContent ||
      contenedor.innerText ||
      ""
    );
  }

  function extraerUrl(valor) {
    const texto = limpiar(valor);
    if (!texto) return "";
    if (/^https?:\/\//i.test(texto)) return texto;

    try {
      const objeto = JSON.parse(texto);
      if (typeof objeto === "string") return objeto;
      if (objeto?.Url) return objeto.Url;
      if (objeto?.url) return objeto.url;
      if (objeto?.link) return objeto.link;
    } catch (_) {
      /* El valor no contiene JSON. */
    }

    const coincidencia = texto.match(/https?:\/\/[^\s"']+/i);
    return coincidencia ? coincidencia[0] : "";
  }

  function convertirFecha(valor) {
    const fecha = new Date(limpiar(valor));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  function transformarFoto(fila) {
    return {
      accessId: limpiar(fila.AccessID),
      comments: textoSinHTML(fila.Comments),
      publicPhotoUrl: extraerUrl(fila.PublicPhotoUrl),
      corporatePhotoUrl: extraerUrl(fila.PhotoLink),
      captureDate: limpiar(fila.CaptureDate)
    };
  }

  function obtenerUltimaFoto(accessId) {
    return fotosAccess
      .filter(
        foto =>
          normalizarId(foto.accessId) ===
          normalizarId(accessId)
      )
      .sort((a, b) => {
        const fechaA = convertirFecha(a.captureDate);
        const fechaB = convertirFecha(b.captureDate);

        return (
          (fechaB ? fechaB.getTime() : 0) -
          (fechaA ? fechaA.getTime() : 0)
        );
      })[0] || null;
  }

  function crearUrlSinCache(url) {
    if (!url) return "";

    return (
      url +
      (url.includes("?") ? "&" : "?") +
      "v=" +
      Date.now()
    );
  }

  function agregarContenidoAlPopup(evento) {
    const sitio = evento?.popup?.options?.sitioAccess;
    if (!sitio) return;

    const popup = document.querySelector(
      ".leaflet-popup-content .popup-access"
    );

    const navegacion = popup?.querySelector(
      ".botones-navegacion"
    );

    if (!popup || !navegacion) return;

    popup.querySelector(".bloque-fotos-access")?.remove();

    navegacion
      .querySelectorAll(
        ".boton-foto-access, .boton-ver-foto-access"
      )
      .forEach(boton => boton.remove());

    const ultimaFoto = obtenerUltimaFoto(sitio.aoiId);
    if (!ultimaFoto) return;

    const bloque = document.createElement("div");
    bloque.className = "bloque-fotos-access";

    if (ultimaFoto.comments) {
      const comentario = document.createElement("p");
      comentario.className = "comentario-foto-access";

      const etiqueta = document.createElement("strong");
      etiqueta.textContent = "Comentario: ";

      comentario.appendChild(etiqueta);
      comentario.appendChild(
        document.createTextNode(ultimaFoto.comments)
      );

      bloque.appendChild(comentario);
    }

    if (ultimaFoto.publicPhotoUrl) {
      const miniatura = document.createElement("img");
      miniatura.className = "miniatura-access";
      miniatura.src = crearUrlSinCache(
        ultimaFoto.publicPhotoUrl
      );
      miniatura.alt =
        "Última fotografía del acceso " +
        limpiar(sitio.location);
      miniatura.loading = "eager";
      miniatura.decoding = "async";
      miniatura.draggable = false;

      miniatura.addEventListener("error", () => {
        console.warn(
          "No fue posible mostrar la última fotografía del Access:",
          ultimaFoto.publicPhotoUrl
        );
        miniatura.remove();
      });

      bloque.appendChild(miniatura);
    }

    if (bloque.children.length) {
      navegacion.parentNode.insertBefore(
        bloque,
        navegacion
      );
    }
  }

  function cargarFotosAccess() {
    Papa.parse(
      ARCHIVO_FOTOS + "?v=" + Date.now(),
      {
        download: true,
        header: true,
        skipEmptyLines: true,

        transformHeader: encabezado =>
          encabezado
            .replace(/^\uFEFF/, "")
            .trim(),

        complete: resultado => {
          fotosAccess = resultado.data
            .map(transformarFoto)
            .filter(
              foto =>
                foto.accessId &&
                (
                  foto.publicPhotoUrl ||
                  foto.corporatePhotoUrl
                )
            );

          if (mapa._popup) {
            agregarContenidoAlPopup({
              popup: mapa._popup
            });
          }

          console.log(
            fotosAccess.length +
            " fotos de Access cargadas."
          );
        },

        error: error => {
          console.error(
            "No fue posible cargar AccessPhotos.csv:",
            error
          );
        }
      }
    );
  }

  if (
    typeof mapa === "undefined" ||
    !mapa?.on
  ) {
    console.error(
      "foto-access-addon.js debe cargarse después de app.js."
    );
    return;
  }

  mapa.on("popupopen", evento => {
    agregarContenidoAlPopup(evento);

    window.setTimeout(
      () => agregarContenidoAlPopup(evento),
      100
    );

    window.setTimeout(
      () => agregarContenidoAlPopup(evento),
      220
    );
  });

  cargarFotosAccess();
})();
