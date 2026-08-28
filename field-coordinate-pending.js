(function () {
  "use strict";

  const PANEL_ID = "fieldCoordinatePendingModal";
  const BUTTON_ID = "fieldCoordinatePendingButton";

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

  function formatearCoordenada(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero)
      ? numero.toFixed(6)
      : "No disponible";
  }

  function formatearPrecision(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero)
      ? `${Math.round(numero)} m`
      : "No disponible";
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

  function obtenerStorage() {
    if (
      !window.FieldCoordinateStorage ||
      typeof window.FieldCoordinateStorage
        .obtenerCoordenadasPendientes !== "function"
    ) {
      throw new Error(
        "El almacenamiento offline de coordenadas no está disponible."
      );
    }

    return window.FieldCoordinateStorage;
  }

  function crearBotonPendientes() {
    let boton = document.getElementById(BUTTON_ID);

    if (boton) return boton;

    boton = document.createElement("button");
    boton.id = BUTTON_ID;
    boton.className = "field-coordinate-pending-button";
    boton.type = "button";
    boton.hidden = true;
    boton.setAttribute(
      "aria-label",
      "Ver coordenadas pendientes de sincronización"
    );
    boton.innerHTML = `
      <span aria-hidden="true">📍</span>
      <span>Coordenadas pendientes</span>
      <strong data-field-coordinate-pending-count>0</strong>
    `;

    boton.addEventListener("click", () => {
      abrirPanelPendientes();
    });

    document.body.appendChild(boton);
    return boton;
  }

  async function actualizarContador() {
    const boton = crearBotonPendientes();

    try {
      const cantidad = await obtenerStorage()
        .contarCoordenadasPendientes();

      const contador = boton.querySelector(
        "[data-field-coordinate-pending-count]"
      );

      if (contador) {
        contador.textContent = String(cantidad);
      }

      boton.hidden = cantidad === 0;
      boton.setAttribute(
        "aria-label",
        cantidad === 1
          ? "Ver 1 coordenada pendiente de sincronización"
          : `Ver ${cantidad} coordenadas pendientes de sincronización`
      );

      window.dispatchEvent(
        new CustomEvent("fieldcoordinates:pending-count", {
          detail: { count: cantidad }
        })
      );

      return cantidad;
    } catch (error) {
      console.error(
        "No fue posible actualizar el contador de coordenadas:",
        error
      );
      boton.hidden = true;
      return 0;
    }
  }

  function crearTarjeta(registro) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "field-coordinate-pending-card";
    tarjeta.dataset.recordId = texto(registro.recordId);

    const tipo = texto(registro.pointType) || "Punto";
    const intentos = Number(registro.syncAttempts || 0);
    const ultimoError = texto(registro.lastSyncError);

    tarjeta.innerHTML = `
      <div class="field-coordinate-pending-card-header">
        <span class="field-coordinate-pending-type">
          ${tipo === "Access" ? "🚜" : "📍"}
          ${escaparHTML(tipo)}
        </span>
        <span class="field-coordinate-pending-date">
          ${escaparHTML(formatearFecha(registro.captureDate))}
        </span>
      </div>

      <h3>${escaparHTML(registro.location || "Localidad")}</h3>

      <p class="field-coordinate-pending-aoi">
        AOI ID: <strong>${escaparHTML(registro.aoiId)}</strong>
      </p>

      <dl class="field-coordinate-pending-data">
        <div>
          <dt>Latitud nueva</dt>
          <dd>${escaparHTML(formatearCoordenada(registro.latitude))}</dd>
        </div>
        <div>
          <dt>Longitud nueva</dt>
          <dd>${escaparHTML(formatearCoordenada(registro.longitude))}</dd>
        </div>
        <div>
          <dt>Precisión</dt>
          <dd>${escaparHTML(formatearPrecision(registro.accuracy))}</dd>
        </div>
        <div>
          <dt>Intentos</dt>
          <dd>${intentos}</dd>
        </div>
      </dl>

      ${
        ultimoError
          ? `<p class="field-coordinate-pending-error">
              Último error: ${escaparHTML(ultimoError)}
            </p>`
          : ""
      }

      <button
        class="field-coordinate-pending-delete"
        type="button"
        data-field-coordinate-delete="${escaparHTML(registro.recordId)}"
      >
        Eliminar captura pendiente
      </button>
    `;

    return tarjeta;
  }

  async function renderizarLista(panel) {
    const lista = panel.querySelector(
      "#fieldCoordinatePendingList"
    );

    if (!lista) return;

    lista.innerHTML = `
      <div class="field-coordinate-pending-loading">
        Consultando coordenadas pendientes...
      </div>
    `;

    try {
      const pendientes = await obtenerStorage()
        .obtenerCoordenadasPendientes();

      lista.replaceChildren();

      if (!pendientes.length) {
        const vacio = document.createElement("div");
        vacio.className = "field-coordinate-pending-empty";
        vacio.textContent =
          "No hay coordenadas pendientes de sincronización.";
        lista.appendChild(vacio);
        return;
      }

      pendientes.forEach(registro => {
        lista.appendChild(crearTarjeta(registro));
      });
    } catch (error) {
      console.error(
        "No fue posible mostrar las coordenadas pendientes:",
        error
      );

      lista.innerHTML = `
        <div class="field-coordinate-pending-error-box">
          ${escaparHTML(
            error?.message ||
              "No fue posible consultar las coordenadas pendientes."
          )}
        </div>
      `;
    }
  }

  async function eliminarPendiente(recordId, panel) {
    const registro = await obtenerStorage()
      .obtenerCoordenadaPorId(recordId);

    if (!registro) {
      window.alert("La coordenada pendiente ya no existe.");
      await renderizarLista(panel);
      await actualizarContador();
      return;
    }

    const descripcion = [
      registro.location || "Localidad",
      registro.aoiId,
      registro.pointType
    ].filter(Boolean).join(" · ");

    const confirmar = window.confirm(
      `¿Eliminar la captura pendiente?\n\n${descripcion}\n\nEsta acción no modifica el Excel ni la coordenada actual del mapa.`
    );

    if (!confirmar) return;

    await obtenerStorage().eliminarCoordenadaLocal(recordId);

    window.dispatchEvent(
      new CustomEvent("fieldcoordinates:pending-updated", {
        detail: {
          deleted: true,
          recordId,
          aoiId: registro.aoiId,
          pointType: registro.pointType
        }
      })
    );

    await renderizarLista(panel);
    await actualizarContador();
  }

  async function abrirPanelPendientes() {
    document.getElementById(PANEL_ID)?.remove();

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "field-coordinate-pending-modal-background";

    panel.innerHTML = `
      <section
        class="field-coordinate-pending-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fieldCoordinatePendingTitle"
      >
        <button
          class="field-coordinate-pending-close"
          type="button"
          aria-label="Cerrar coordenadas pendientes"
        >×</button>

        <h2 id="fieldCoordinatePendingTitle">
          Coordenadas pendientes
        </h2>

        <p class="field-coordinate-pending-description">
          Estas capturas están guardadas solamente en este dispositivo.
          Podrás revisarlas o eliminarlas antes de sincronizar.
        </p>

        <div
          id="fieldCoordinatePendingList"
          class="field-coordinate-pending-list"
        ></div>

        <div class="field-coordinate-pending-footer">
          <button
            class="field-coordinate-pending-close-footer"
            type="button"
          >Cerrar</button>
        </div>
      </section>
    `;

    document.body.appendChild(panel);
    document.body.style.overflow = "hidden";

    const cerrar = () => {
      panel.remove();
      document.body.style.overflow = "";
    };

    panel
      .querySelector(".field-coordinate-pending-close")
      .addEventListener("click", cerrar);

    panel
      .querySelector(".field-coordinate-pending-close-footer")
      .addEventListener("click", cerrar);

    panel.addEventListener("click", evento => {
      if (evento.target === panel) cerrar();
    });

    panel.addEventListener("click", async evento => {
      const boton = evento.target.closest(
        "[data-field-coordinate-delete]"
      );

      if (!boton) return;

      evento.preventDefault();
      evento.stopPropagation();
      boton.disabled = true;

      try {
        await eliminarPendiente(
          boton.dataset.fieldCoordinateDelete,
          panel
        );
      } catch (error) {
        console.error(
          "No fue posible eliminar la coordenada pendiente:",
          error
        );
        window.alert(
          error?.message ||
            "No fue posible eliminar la coordenada pendiente."
        );
        boton.disabled = false;
      }
    });

    await renderizarLista(panel);
  }

  window.addEventListener(
    "fieldcoordinates:pending-updated",
    async () => {
      await actualizarContador();

      const panel = document.getElementById(PANEL_ID);
      if (panel) {
        await renderizarLista(panel);
      }
    }
  );

  window.FieldCoordinatePending = {
    abrirPanelPendientes,
    actualizarContador,
    renderizarLista
  };

  function iniciar() {
    crearBotonPendientes();
    actualizarContador();
    console.log(
      "Administrador de coordenadas pendientes preparado."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, {
      once: true
    });
  } else {
    iniciar();
  }
})();
