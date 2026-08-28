(function () {
  "use strict";

  const PANEL_ID = "fieldCoordinatePendingModal";
  let sincronizando = false;

  function obtenerPanel() {
    return document.getElementById(PANEL_ID);
  }

  function obtenerFooter(panel) {
    return panel?.querySelector(".field-coordinate-pending-footer") || null;
  }

  function crearControles(panel) {
    if (!panel || panel.querySelector("[data-field-coordinate-sync-controls]")) {
      return;
    }

    const footer = obtenerFooter(panel);
    if (!footer) return;

    const controles = document.createElement("div");
    controles.className = "field-coordinate-sync-controls";
    controles.dataset.fieldCoordinateSyncControls = "true";

    controles.innerHTML = `
      <div
        class="field-coordinate-sync-message"
        data-field-coordinate-sync-message
        role="status"
        aria-live="polite"
      ></div>

      <button
        class="field-coordinate-sync-button"
        data-field-coordinate-sync-button
        type="button"
      >
        Sincronizar coordenadas
      </button>

      <button
        class="field-coordinate-sync-configure"
        data-field-coordinate-sync-configure
        type="button"
      >
        Configurar sincronización
      </button>
    `;

    footer.insertBefore(controles, footer.firstChild);

    controles
      .querySelector("[data-field-coordinate-sync-button]")
      .addEventListener("click", sincronizarDesdePanel);

    controles
      .querySelector("[data-field-coordinate-sync-configure]")
      .addEventListener("click", configurarDesdePanel);

    actualizarControles(panel);
  }

  async function actualizarControles(panel = obtenerPanel()) {
    if (!panel) return;

    crearControles(panel);

    const botonSincronizar = panel.querySelector(
      "[data-field-coordinate-sync-button]"
    );
    const botonConfigurar = panel.querySelector(
      "[data-field-coordinate-sync-configure]"
    );

    if (!botonSincronizar || !botonConfigurar) return;

    const configurada = Boolean(
      window.FieldCoordinateSync &&
      typeof window.FieldCoordinateSync.tieneUrlConfigurada === "function" &&
      window.FieldCoordinateSync.tieneUrlConfigurada()
    );

    let cantidad = 0;

    try {
      cantidad = await window.FieldCoordinateStorage
        .contarCoordenadasPendientes();
    } catch (error) {
      console.warn(
        "No fue posible contar las coordenadas pendientes:",
        error
      );
    }

    botonSincronizar.disabled =
      sincronizando ||
      cantidad === 0 ||
      !navigator.onLine ||
      !configurada;

    botonSincronizar.textContent = sincronizando
      ? "Sincronizando..."
      : cantidad === 1
        ? "Sincronizar 1 coordenada"
        : `Sincronizar ${cantidad} coordenadas`;

    botonConfigurar.textContent = configurada
      ? "Cambiar configuración"
      : "Configurar sincronización";
  }

  function mostrarMensaje(mensaje, tipo = "info", panel = obtenerPanel()) {
    const elemento = panel?.querySelector(
      "[data-field-coordinate-sync-message]"
    );

    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.className =
      `field-coordinate-sync-message field-coordinate-sync-message-${tipo}`;
    elemento.hidden = !mensaje;
  }

  async function configurarDesdePanel() {
    if (
      !window.FieldCoordinateSync ||
      typeof window.FieldCoordinateSync.configurarConDialogo !== "function"
    ) {
      window.alert("El módulo de sincronización no está disponible.");
      return;
    }

    const configurada =
      window.FieldCoordinateSync.configurarConDialogo();

    await actualizarControles();

    if (configurada) {
      mostrarMensaje(
        "Sincronización configurada. Ya podés enviar las coordenadas pendientes.",
        "success"
      );
    }
  }

  async function sincronizarDesdePanel() {
    if (sincronizando) return;

    if (
      !window.FieldCoordinateSync ||
      typeof window.FieldCoordinateSync.sincronizarTodas !== "function"
    ) {
      mostrarMensaje(
        "El módulo de sincronización no está disponible.",
        "error"
      );
      return;
    }

    if (!navigator.onLine) {
      mostrarMensaje(
        "El dispositivo está sin conexión. Las coordenadas siguen guardadas.",
        "error"
      );
      return;
    }

    if (!window.FieldCoordinateSync.tieneUrlConfigurada()) {
      mostrarMensaje(
        "Primero configurá la URL de Power Automate.",
        "error"
      );
      await actualizarControles();
      return;
    }

    sincronizando = true;
    mostrarMensaje(
      "Enviando coordenadas a la base de SharePoint...",
      "info"
    );
    await actualizarControles();

    try {
      const resultado =
        await window.FieldCoordinateSync.sincronizarTodas();

      if (resultado.empty) {
        mostrarMensaje(
          "No hay coordenadas pendientes.",
          "info"
        );
      } else if (resultado.success) {
        mostrarMensaje(
          resultado.synchronized === 1
            ? "Coordenada sincronizada correctamente."
            : `${resultado.synchronized} coordenadas sincronizadas correctamente.`,
          "success"
        );
      } else {
        mostrarMensaje(
          `Se sincronizaron ${resultado.synchronized} y fallaron ${resultado.failed}. Las capturas con error permanecen pendientes.`,
          "error"
        );
      }
    } catch (error) {
      console.error(
        "No fue posible sincronizar las coordenadas:",
        error
      );

      mostrarMensaje(
        error?.message ||
          "No fue posible sincronizar las coordenadas.",
        "error"
      );
    } finally {
      sincronizando = false;

      if (
        window.FieldCoordinatePending &&
        typeof window.FieldCoordinatePending.actualizarContador === "function"
      ) {
        await window.FieldCoordinatePending.actualizarContador();
      }

      const panel = obtenerPanel();

      if (
        panel &&
        window.FieldCoordinatePending &&
        typeof window.FieldCoordinatePending.renderizarLista === "function"
      ) {
        await window.FieldCoordinatePending.renderizarLista(panel);
      }

      await actualizarControles(panel);
    }
  }

  document.addEventListener("click", evento => {
    const botonPendientes = evento.target.closest(
      "#fieldCoordinatePendingButton"
    );

    if (!botonPendientes) return;

    window.setTimeout(() => {
      const panel = obtenerPanel();
      if (panel) crearControles(panel);
    }, 0);
  });

  window.addEventListener("fieldcoordinates:pending-updated", () => {
    actualizarControles();
  });

  window.addEventListener("fieldcoordinates:sync-config-updated", () => {
    actualizarControles();
  });

  window.addEventListener("online", () => {
    actualizarControles();
    mostrarMensaje(
      "Conexión recuperada. Ya podés sincronizar.",
      "success"
    );
  });

  window.addEventListener("offline", () => {
    actualizarControles();
    mostrarMensaje(
      "Sin conexión. Las coordenadas permanecerán guardadas en el dispositivo.",
      "error"
    );
  });

  window.FieldCoordinateSyncUI = {
    crearControles,
    actualizarControles,
    sincronizarDesdePanel
  };

  console.log("Interfaz de sincronización de coordenadas preparada.");
})();
