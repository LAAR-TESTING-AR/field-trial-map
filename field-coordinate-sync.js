(function () {
  "use strict";

  const STORAGE_KEY = "fieldTrialMapCoordinatePowerAutomateUrl";
  let sincronizacionEnCurso = false;

  function obtenerUrl() {
    return String(window.localStorage.getItem(STORAGE_KEY) || "").trim();
  }

  function tieneUrlConfigurada() {
    return /^https:\/\//i.test(obtenerUrl());
  }

  function validarUrl(url) {
    const valor = String(url || "").trim();
    if (!valor) throw new Error("La URL no puede quedar vacía.");

    let direccion;
    try {
      direccion = new URL(valor);
    } catch (_) {
      throw new Error("La dirección ingresada no es una URL válida.");
    }

    if (direccion.protocol !== "https:") {
      throw new Error("La URL debe comenzar con https://");
    }

    return direccion.href;
  }

  function guardarUrl(url) {
    const urlValidada = validarUrl(url);
    window.localStorage.setItem(STORAGE_KEY, urlValidada);

    window.dispatchEvent(
      new CustomEvent("fieldcoordinates:sync-config-updated", {
        detail: { configured: true }
      })
    );

    return true;
  }

  function borrarUrl() {
    window.localStorage.removeItem(STORAGE_KEY);

    window.dispatchEvent(
      new CustomEvent("fieldcoordinates:sync-config-updated", {
        detail: { configured: false }
      })
    );
  }

  function configurarConDialogo() {
    const ingresada = window.prompt(
      "Pegá la URL HTTP de Power Automate para sincronizar coordenadas. Quedará guardada solamente en este dispositivo.",
      obtenerUrl()
    );

    if (ingresada === null) return false;

    try {
      guardarUrl(ingresada);
      window.alert("Sincronización de coordenadas configurada correctamente.");
      return true;
    } catch (error) {
      window.alert(error?.message || "No fue posible guardar la URL.");
      return false;
    }
  }

  function construirPayload(registro) {
    return {
      recordId: String(registro.recordId || ""),
      aoiId: String(registro.aoiId || ""),
      location: String(registro.location || ""),
      pointType: String(registro.pointType || ""),
      latitude: Number(registro.latitude),
      longitude: Number(registro.longitude),
      accuracy: Number(registro.accuracy),
      previousLatitude:
        registro.previousLatitude === null ||
        registro.previousLatitude === undefined ||
        registro.previousLatitude === ""
          ? null
          : Number(registro.previousLatitude),
      previousLongitude:
        registro.previousLongitude === null ||
        registro.previousLongitude === undefined ||
        registro.previousLongitude === ""
          ? null
          : Number(registro.previousLongitude),
      captureDate: String(registro.captureDate || new Date().toISOString())
    };
  }

  async function leerRespuesta(response) {
    const texto = await response.text();
    if (!texto) return {};

    try {
      return JSON.parse(texto);
    } catch (_) {
      return { message: texto };
    }
  }

  async function enviarRegistro(registro) {
    if (!navigator.onLine) {
      throw new Error("El dispositivo está sin conexión.");
    }

    if (!tieneUrlConfigurada()) {
      throw new Error("La sincronización de coordenadas no está configurada.");
    }

    if (!registro?.recordId || !registro?.aoiId) {
      throw new Error("La coordenada pendiente no tiene identificación válida.");
    }

    if (!["Trial", "Access"].includes(registro.pointType)) {
      throw new Error("El tipo de punto debe ser Trial o Access.");
    }

    const response = await fetch(obtenerUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(construirPayload(registro)),
      cache: "no-store",
      credentials: "omit"
    });

    const respuesta = await leerRespuesta(response);

    if (!response.ok) {
      throw new Error(
        respuesta?.message ||
          `Power Automate respondió con estado ${response.status}.`
      );
    }

    if (respuesta?.success !== true) {
      throw new Error(
        respuesta?.message ||
          "Power Automate no confirmó la actualización de coordenadas."
      );
    }

    if (
      respuesta.recordId &&
      String(respuesta.recordId) !== String(registro.recordId)
    ) {
      throw new Error("La respuesta no corresponde al registro enviado.");
    }

    return respuesta;
  }

  async function sincronizarRegistro(recordId) {
    if (
      !window.FieldCoordinateStorage ||
      typeof window.FieldCoordinateStorage.obtenerCoordenadaPorId !== "function"
    ) {
      throw new Error("El almacenamiento offline no está disponible.");
    }

    const registro =
      await window.FieldCoordinateStorage.obtenerCoordenadaPorId(recordId);

    if (!registro) {
      throw new Error("No se encontró la coordenada pendiente.");
    }

    try {
      const respuesta = await enviarRegistro(registro);

      await window.FieldCoordinateStorage.eliminarCoordenadaLocal(
        registro.recordId
      );

      const cantidad =
        await window.FieldCoordinateStorage.contarCoordenadasPendientes();

      window.dispatchEvent(
        new CustomEvent("fieldcoordinates:pending-updated", {
          detail: {
            count: cantidad,
            synchronized: true,
            recordId: registro.recordId,
            aoiId: registro.aoiId,
            pointType: registro.pointType
          }
        })
      );

      return {
        success: true,
        recordId: registro.recordId,
        response: respuesta
      };
    } catch (error) {
      if (
        typeof window.FieldCoordinateStorage.marcarIntentoFallido === "function"
      ) {
        try {
          await window.FieldCoordinateStorage.marcarIntentoFallido(
            registro.recordId,
            error?.message || "Error de sincronización"
          );
        } catch (storageError) {
          console.error("No fue posible registrar el intento fallido:", storageError);
        }
      }

      window.dispatchEvent(
        new CustomEvent("fieldcoordinates:pending-updated")
      );

      throw error;
    }
  }

  async function sincronizarTodas() {
    if (sincronizacionEnCurso) {
      throw new Error("Ya hay una sincronización de coordenadas en curso.");
    }

    if (
      !window.FieldCoordinateStorage ||
      typeof window.FieldCoordinateStorage.obtenerCoordenadasPendientes !== "function"
    ) {
      throw new Error("El almacenamiento offline no está disponible.");
    }

    if (!navigator.onLine) {
      throw new Error("El dispositivo está sin conexión.");
    }

    if (!tieneUrlConfigurada()) {
      throw new Error("La sincronización de coordenadas no está configurada.");
    }

    const pendientes =
      await window.FieldCoordinateStorage.obtenerCoordenadasPendientes();

    if (!pendientes.length) {
      return {
        success: true,
        empty: true,
        synchronized: 0,
        failed: 0
      };
    }

    sincronizacionEnCurso = true;
    let sincronizadas = 0;
    const errores = [];

    window.dispatchEvent(
      new CustomEvent("fieldcoordinates:sync-started", {
        detail: { total: pendientes.length }
      })
    );

    try {
      for (const registro of pendientes) {
        try {
          await sincronizarRegistro(registro.recordId);
          sincronizadas += 1;

          window.dispatchEvent(
            new CustomEvent("fieldcoordinates:sync-progress", {
              detail: {
                total: pendientes.length,
                synchronized: sincronizadas,
                failed: errores.length
              }
            })
          );
        } catch (error) {
          errores.push({
            recordId: registro.recordId,
            message: error?.message || "Error desconocido"
          });
        }
      }

      const resultado = {
        success: errores.length === 0,
        synchronized: sincronizadas,
        failed: errores.length,
        errors: errores
      };

      window.dispatchEvent(
        new CustomEvent("fieldcoordinates:sync-finished", {
          detail: resultado
        })
      );

      return resultado;
    } finally {
      sincronizacionEnCurso = false;
    }
  }

  function estaSincronizando() {
    return sincronizacionEnCurso;
  }

  window.FieldCoordinateSync = {
    obtenerUrl,
    tieneUrlConfigurada,
    guardarUrl,
    borrarUrl,
    configurarConDialogo,
    construirPayload,
    enviarRegistro,
    sincronizarRegistro,
    sincronizarTodas,
    estaSincronizando
  };

  console.log(
    tieneUrlConfigurada()
      ? "Sincronización de coordenadas preparada y configurada."
      : "Sincronización de coordenadas preparada; falta configurar Power Automate."
  );
})();
