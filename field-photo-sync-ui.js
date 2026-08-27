(function () {
  "use strict";

  let procesando = false;

  async function obtenerPendientes() {
    if (!window.FieldPhotoStorage) {
      throw new Error("El almacenamiento offline no está disponible.");
    }

    return window.FieldPhotoStorage.obtenerFotosPendientes();
  }

  async function actualizarBoton() {
    const boton = document.getElementById("fieldPendingSyncButton");
    if (!boton || procesando) return;

    const pendientes = await obtenerPendientes();
    const disponible =
      navigator.onLine &&
      pendientes.length > 0 &&
      window.FieldPhotoSync &&
      typeof window.FieldPhotoSync.sincronizarRegistro === "function";

    boton.disabled = !disponible;
    boton.textContent = "Sincronizar todo";
    boton.title = !navigator.onLine
      ? "Necesitás conexión para sincronizar."
      : pendientes.length === 0
        ? "No hay fotografías pendientes."
        : `Sincronizar ${pendientes.length} fotografía${pendientes.length === 1 ? "" : "s"}.`;
  }

  async function sincronizarTodo() {
    if (procesando) return;

    if (!navigator.onLine) {
      window.alert("El dispositivo está sin conexión.");
      return;
    }

    if (!window.FieldPhotoSync?.tieneUrlConfigurada()) {
      const configurada = window.FieldPhotoSync?.configurarConDialogo();
      if (!configurada) return;
    }

    const pendientes = await obtenerPendientes();

    if (!pendientes.length) {
      window.alert("No hay fotografías pendientes.");
      await actualizarBoton();
      return;
    }

    const confirmar = window.confirm(
      `¿Sincronizar ${pendientes.length} fotografía${pendientes.length === 1 ? "" : "s"} pendiente${pendientes.length === 1 ? "" : "s"}?`
    );

    if (!confirmar) return;

    const boton = document.getElementById("fieldPendingSyncButton");
    const resumen = document.getElementById("fieldPendingResumen");

    procesando = true;
    let exitosas = 0;
    let fallidas = 0;

    try {
      for (let indice = 0; indice < pendientes.length; indice += 1) {
        const registro = pendientes[indice];

        if (boton) {
          boton.disabled = true;
          boton.textContent = `Sincronizando ${indice + 1} de ${pendientes.length}...`;
        }

        if (resumen) {
          resumen.textContent =
            `Enviando fotografía ${indice + 1} de ${pendientes.length}. ` +
            "No cierres la aplicación.";
        }

        try {
          await window.FieldPhotoSync.sincronizarRegistro(registro.recordId);
          exitosas += 1;
        } catch (error) {
          fallidas += 1;
          console.error("Error al sincronizar", registro.recordId, error);
        }
      }
    } finally {
      procesando = false;
      window.dispatchEvent(new CustomEvent("fieldphotos:pending-updated"));
    }

    document.getElementById("fieldPendingModal")?.remove();

    if (fallidas === 0) {
      window.alert(
        `Sincronización completada. ${exitosas} fotografía${exitosas === 1 ? "" : "s"} enviada${exitosas === 1 ? "" : "s"}.`
      );
    } else {
      window.alert(
        `Sincronización parcial: ${exitosas} enviada${exitosas === 1 ? "" : "s"} y ${fallidas} pendiente${fallidas === 1 ? "" : "s"}.`
      );
    }
  }

  function conectarBoton() {
    const boton = document.getElementById("fieldPendingSyncButton");
    if (!boton) return;

    if (boton.dataset.syncConnected !== "true") {
      boton.dataset.syncConnected = "true";
      boton.addEventListener("click", sincronizarTodo);
    }

    actualizarBoton().catch(error => {
      console.error("No fue posible preparar Sincronizar todo:", error);
    });
  }

  const observador = new MutationObserver(conectarBoton);

  function iniciar() {
    observador.observe(document.body, {
      childList: true,
      subtree: true
    });

    conectarBoton();
  }

  window.addEventListener("online", conectarBoton);
  window.addEventListener("offline", conectarBoton);
  window.addEventListener("fieldphotos:pending-updated", conectarBoton);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  console.log("Interfaz de sincronización Field Photos preparada.");
})();
