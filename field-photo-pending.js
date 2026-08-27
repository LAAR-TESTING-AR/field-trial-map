(function () {
  "use strict";

  const urlsTemporales = new Set();

  function escaparHTML(valor) {
    return String(valor ?? "")
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

  function liberarUrlsTemporales() {
    urlsTemporales.forEach(url => URL.revokeObjectURL(url));
    urlsTemporales.clear();
  }

  function agruparPorVisita(registros) {
    const grupos = new Map();

    registros.forEach(registro => {
      const visitId = registro.visitId || registro.recordId;

      if (!grupos.has(visitId)) {
        grupos.set(visitId, {
          visitId,
          aoiId: registro.aoiId,
          location: registro.location,
          photoType: registro.photoType,
          crop: registro.crop,
          cropStage: registro.cropStage,
          comments: registro.comments,
          captureDate: registro.captureDate,
          photos: []
        });
      }

      grupos.get(visitId).photos.push(registro);
    });

    return [...grupos.values()]
      .map(visita => {
        visita.photos.sort(
          (a, b) => Number(a.photoOrder || 1) - Number(b.photoOrder || 1)
        );
        return visita;
      })
      .sort(
        (a, b) => new Date(a.captureDate) - new Date(b.captureDate)
      );
  }
const cerrarVisor = () => {
  const imagen = visor.querySelector(
    ".field-photo-viewer-imagen"
  );

  if (imagen) {
    imagen.src = "";
    imagen.remove();
  }

  visor.style.display = "none";
  visor.remove();

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
};
  

    visor.innerHTML = `
      <div
        class="field-photo-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Vista ampliada de la fotografía"
      >
        <button
          class="field-photo-viewer-cerrar"
          type="button"
          aria-label="Cerrar fotografía"
        >×</button>

        <img
          class="field-photo-viewer-imagen"
          src="${urlFoto}"
          alt="${escaparHTML(descripcion)}"
        >

        <p class="field-photo-viewer-ayuda">
          Fotografía ajustada a la pantalla
        </p>
      </div>
    `;

    document.body.appendChild(visor);

    const cerrarVisor = () => visor.remove();

    visor
      .querySelector(".field-photo-viewer-cerrar")
      .addEventListener("click", cerrarVisor);

    visor.addEventListener("click", evento => {
      if (
        evento.target === visor ||
        evento.target.classList.contains("field-photo-viewer")
      ) {
        cerrarVisor();
      }
    });
  }

  function crearTarjetaVisita(visita, refrescarPanel) {
    const item = document.createElement("article");
    item.className = "field-pending-item field-pending-visit-item";
    item.dataset.visitId = visita.visitId;

    const esAccess =
      String(visita.photoType || "").toLowerCase() === "access";

    const claseTipo = esAccess
      ? "field-pending-tipo field-pending-tipo-access"
      : "field-pending-tipo";

    const fotosConUrl = visita.photos
      .filter(registro => registro.photoBlob instanceof Blob)
      .map((registro, indice) => {
        const url = URL.createObjectURL(registro.photoBlob);
        urlsTemporales.add(url);

        return {
          registro,
          url,
          order: Number(registro.photoOrder || indice + 1)
        };
      });

    const galeriaHTML = fotosConUrl.length
      ? fotosConUrl
          .map(
            foto => `
              <button
                class="field-pending-photo-thumb"
                type="button"
                data-photo-order="${foto.order}"
                aria-label="Ver fotografía ${foto.order}"
              >
                <img
                  src="${foto.url}"
                  alt="Fotografía ${foto.order} de ${escaparHTML(visita.location)}"
                >
                <span>${foto.order}</span>
              </button>
            `
          )
          .join("")
      : `<div class="field-pending-vacio">Las fotografías no están disponibles.</div>`;

    item.innerHTML = `
      <div class="field-pending-contenido">
        <div class="field-pending-cabecera">
          <span class="${claseTipo}">
            ${escaparHTML(visita.photoType || "Foto")}
          </span>

          <span class="field-pending-fecha">
            ${escaparHTML(formatearFecha(visita.captureDate))}
          </span>
        </div>

        <h3 class="field-pending-localidad">
          ${escaparHTML(visita.location || "Localidad sin informar")}
        </h3>

        <p class="field-pending-detalle">
          <strong>AOI ID:</strong>
          ${escaparHTML(visita.aoiId || "Sin AOI ID")}
        </p>

        ${
          visita.crop
            ? `<p class="field-pending-detalle">
                <strong>Cultivo:</strong>
                ${escaparHTML(visita.crop)}
              </p>`
            : ""
        }

        ${
          visita.cropStage
            ? `<p class="field-pending-detalle">
                <strong>Estadio:</strong>
                ${escaparHTML(visita.cropStage)}
              </p>`
            : ""
        }

        <p class="field-pending-detalle">
          <strong>Fotografías:</strong>
          ${visita.photos.length}
        </p>

        ${
          visita.comments
            ? `<p class="field-pending-comentario">
                ${escaparHTML(visita.comments)}
              </p>`
            : ""
        }

        <div class="field-pending-visit-gallery">
          ${galeriaHTML}
        </div>

        <div class="field-pending-acciones-item field-pending-visit-actions">
          <button class="field-pending-eliminar" type="button">
            Eliminar visita
          </button>
        </div>
      </div>
    `;

    item
      .querySelectorAll(".field-pending-photo-thumb")
      .forEach((boton, indice) => {
        boton.addEventListener("click", () => {
          const foto = fotosConUrl[indice];
          if (!foto) return;

          abrirVisorFoto(
            foto.url,
            `Fotografía ${foto.order} de ${visita.location || "la visita"}`
          );
        });
      });

    item
      .querySelector(".field-pending-eliminar")
      .addEventListener("click", async () => {
        const confirmar = window.confirm(
          `¿Eliminar esta visita y sus ${visita.photos.length} fotografía${
            visita.photos.length === 1 ? "" : "s"
          } del dispositivo?`
        );

        if (!confirmar) return;

        try {
          if (
            typeof window.FieldPhotoStorage.eliminarVisitaLocal === "function"
          ) {
            await window.FieldPhotoStorage.eliminarVisitaLocal(visita.visitId);
          } else {
            await Promise.all(
              visita.photos.map(registro =>
                window.FieldPhotoStorage.eliminarFotoLocal(registro.recordId)
              )
            );
          }

          window.dispatchEvent(
            new CustomEvent("fieldphotos:pending-updated")
          );

          await refrescarPanel();
        } catch (error) {
          console.error("No fue posible eliminar la visita pendiente:", error);
          window.alert("No fue posible eliminar la visita pendiente.");
        }
      });

    return item;
  }

  async function abrirPanelPendientes() {
    if (
      !window.FieldPhotoStorage ||
      typeof window.FieldPhotoStorage.obtenerFotosPendientes !== "function"
    ) {
      console.error(
        "El almacenamiento offline de Field Photos no está disponible."
      );
      return;
    }

    document.getElementById("fieldPendingModal")?.remove();
    liberarUrlsTemporales();

    const fondo = document.createElement("div");
    fondo.id = "fieldPendingModal";
    fondo.className = "field-pending-modal-fondo";

    fondo.innerHTML = `
      <section
        class="field-pending-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fieldPendingTitulo"
      >
        <button
          class="field-pending-modal-cerrar"
          type="button"
          aria-label="Cerrar"
        >×</button>

        <h2 id="fieldPendingTitulo">Pendientes de sincronización</h2>

        <p id="fieldPendingResumen" class="field-pending-resumen">
          Consultando visitas guardadas en este dispositivo...
        </p>

        <div id="fieldPendingLista" class="field-pending-lista"></div>

        <div class="field-pending-pie">
          <button class="field-pending-cerrar" type="button">Cerrar</button>

          <button
            id="fieldPendingSyncButton"
            class="field-pending-sincronizar"
            type="button"
            disabled
          >
            Sincronizar todo
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(fondo);
const cerrarPanel = () => {
  const visorAbierto =
    document.getElementById("fieldPhotoViewer");

  if (visorAbierto) {
    visorAbierto
      .querySelectorAll("img")
      .forEach(imagen => {
        imagen.src = "";
        imagen.remove();
      });

    visorAbierto.style.display = "none";
    visorAbierto.remove();
  }

  liberarUrlsTemporales();

  fondo.style.display = "none";
  fondo.remove();

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";

  window.setTimeout(() => {
    document
      .querySelectorAll(
        "#fieldPhotoViewer, .field-photo-viewer-fondo"
      )
      .forEach(elemento => elemento.remove());
  }, 50);
};
    

    fondo
      .querySelector(".field-pending-modal-cerrar")
      .addEventListener("click", cerrarPanel);

    fondo
      .querySelector(".field-pending-cerrar")
      .addEventListener("click", cerrarPanel);

    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) cerrarPanel();
    });

    async function refrescarPanel() {
      liberarUrlsTemporales();

      const lista = fondo.querySelector("#fieldPendingLista");
      const resumen = fondo.querySelector("#fieldPendingResumen");
      const botonSincronizar = fondo.querySelector("#fieldPendingSyncButton");

      const registros =
        await window.FieldPhotoStorage.obtenerFotosPendientes();
      const visitas = agruparPorVisita(registros);

      lista.replaceChildren();

      resumen.textContent =
        visitas.length === 1
          ? `1 visita pendiente con ${registros.length} fotografía${
              registros.length === 1 ? "" : "s"
            }.`
          : `${visitas.length} visitas pendientes con ${registros.length} fotografías.`;

      botonSincronizar.disabled = true;
      botonSincronizar.title =
        "La sincronización se habilitará en el próximo paso.";

      if (!visitas.length) {
        const vacio = document.createElement("div");
        vacio.className = "field-pending-vacio";
        vacio.textContent = "No hay visitas pendientes de sincronización.";
        lista.appendChild(vacio);
      } else {
        visitas.forEach(visita => {
          lista.appendChild(crearTarjetaVisita(visita, refrescarPanel));
        });
      }

      console.log("Visitas pendientes disponibles:", visitas);
    }

    try {
      await refrescarPanel();
    } catch (error) {
      console.error("No fue posible mostrar las visitas pendientes:", error);
      fondo.querySelector("#fieldPendingResumen").textContent =
        "No fue posible consultar las visitas pendientes.";
    }
  }

  function conectarBotonPendientes() {
    const boton = document.getElementById("pwaFotosPendientes");
    if (!boton) return false;

    if (boton.dataset.pendingConnected === "true") return true;

    boton.dataset.pendingConnected = "true";
    boton.addEventListener("click", abrirPanelPendientes);
    console.log("Botón de fotografías pendientes conectado.");
    return true;
  }

  function iniciar() {
    if (conectarBotonPendientes()) return;

    let intentos = 0;
    const temporizador = window.setInterval(() => {
      intentos += 1;

      if (conectarBotonPendientes() || intentos >= 100) {
        window.clearInterval(temporizador);
      }
    }, 100);
  }

  window.FieldPhotoPending = {
    abrirPanelPendientes
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
