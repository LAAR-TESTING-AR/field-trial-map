(function () {
  "use strict";

  const STORAGE_KEY = "fieldTrialMapPowerAutomateUrl";
  let sincronizacionEnCurso = false;

  function obtenerUrl() {
    return String(
      window.localStorage.getItem(STORAGE_KEY) || ""
    ).trim();
  }

  function tieneUrlConfigurada() {
    return /^https:\/\//i.test(obtenerUrl());
  }

  function validarUrl(url) {
    const valor = String(url || "").trim();

    if (!valor) {
      throw new Error("La URL no puede quedar vacía.");
    }

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
      new CustomEvent("fieldphotos:sync-config-updated", {
        detail: { configured: true }
      })
    );

    console.log(
      "Sincronización de Field Photos configurada en este dispositivo."
    );

    return true;
  }

  function borrarUrl() {
    window.localStorage.removeItem(STORAGE_KEY);

    window.dispatchEvent(
      new CustomEvent("fieldphotos:sync-config-updated", {
        detail: { configured: false }
      })
    );

    console.log("Configuración local de sincronización eliminada.");
  }

  function configurarConDialogo() {
    const actual = obtenerUrl();

    const ingresada = window.prompt(
      "Pegá la URL HTTP de Power Automate para este dispositivo. La dirección quedará guardada solamente de forma local.",
      actual
    );

    if (ingresada === null) return false;

    try {
      guardarUrl(ingresada);
      window.alert(
        "Sincronización configurada correctamente en este dispositivo."
      );
      return true;
    } catch (error) {
      window.alert(
        error?.message ||
          "No fue posible guardar la URL de sincronización."
      );
      return false;
    }
  }

  function blobADataUrl(blob) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();

      lector.onload = () => resolve(String(lector.result || ""));
      lector.onerror = () => {
        reject(new Error("No fue posible leer la fotografía local."));
      };

      lector.readAsDataURL(blob);
    });
  }

  async function blobABase64(blob) {
    if (!(blob instanceof Blob)) {
      throw new Error("La fotografía local no es válida.");
    }

    const dataUrl = await blobADataUrl(blob);
    const separador = dataUrl.indexOf(",");

    if (separador < 0) {
      throw new Error("No fue posible convertir la fotografía a Base64.");
    }

    return dataUrl.slice(separador + 1);
  }

  function construirPayload(registro, imageBase64) {
    return {
      recordId: String(registro.recordId || ""),
      visitId: String(registro.visitId || registro.recordId || ""),
      photoOrder: Number(registro.photoOrder || 1),
      aoiId: String(registro.aoiId || ""),
      location: String(registro.location || ""),
      photoType: String(registro.photoType || ""),
      crop: String(registro.crop || ""),
cropStage: String(registro.cropStage || ""),
visitScore:
  registro.visitScore === null ||
  registro.visitScore === undefined ||
  registro.visitScore === ""
    ? null
    : Number(registro.visitScore),
comments: String(registro.comments || ""),
      captureDate: String(
        registro.captureDate || new Date().toISOString()
      ),
      fileName: String(registro.fileName || `${registro.recordId}.jpg`),
      mimeType: String(registro.mimeType || "image/jpeg"),
      imageBase64
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
      throw new Error(
        "La sincronización no está configurada en este dispositivo."
      );
    }

    if (!registro?.recordId) {
      throw new Error("El registro pendiente no tiene recordId.");
    }

    const imageBase64 = await blobABase64(registro.photoBlob);
    const payload = construirPayload(registro, imageBase64);

    const response = await fetch(obtenerUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload),
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
          "Power Automate no confirmó la sincronización."
      );
    }

    if (
      respuesta.recordId &&
      String(respuesta.recordId) !== String(registro.recordId)
    ) {
      throw new Error(
        "La respuesta de Power Automate no corresponde al registro enviado."
      );
    }

    return respuesta;
  }

  async function sincronizarRegistro(recordId) {
    if (
      !window.FieldPhotoStorage ||
      typeof window.FieldPhotoStorage.obtenerFotoPorId !== "function"
    ) {
      throw new Error("El almacenamiento offline no está disponible.");
    }

    const registro =
      await window.FieldPhotoStorage.obtenerFotoPorId(recordId);

    if (!registro) {
      throw new Error("No se encontró la fotografía pendiente.");
    }

    try {
      const respuesta = await enviarRegistro(registro);

      await window.FieldPhotoStorage.eliminarFotoLocal(registro.recordId);

      window.dispatchEvent(
        new CustomEvent("fieldphotos:pending-updated")
      );
if (
  window.FieldPhotoHistory &&
  typeof window.FieldPhotoHistory.cargarHistorial === "function"
) {
  try {
    await window.FieldPhotoHistory.cargarHistorial(true);
  } catch (error) {
    console.warn(
      "No fue posible refrescar el historial:",
      error
    );
  }
}
      console.log("Field Photo sincronizada:", {
        recordId: registro.recordId,
        visitId: registro.visitId,
        photoOrder: registro.photoOrder
      });

      return {
        success: true,
        recordId: registro.recordId,
        response: respuesta
      };
    } catch (error) {
      if (
        typeof window.FieldPhotoStorage.marcarIntentoFallido === "function"
      ) {
        try {
          await window.FieldPhotoStorage.marcarIntentoFallido(
            registro.recordId,
            error?.message || "Error de sincronización"
          );
        } catch (storageError) {
          console.error(
            "No fue posible registrar el intento fallido:",
            storageError
          );
        }
      }

      throw error;
    }
  }

  async function sincronizarPrimeraPendiente() {
    if (sincronizacionEnCurso) {
      throw new Error("Ya hay una sincronización en curso.");
    }

    if (
      !window.FieldPhotoStorage ||
      typeof window.FieldPhotoStorage.obtenerFotosPendientes !== "function"
    ) {
      throw new Error("El almacenamiento offline no está disponible.");
    }

    const pendientes =
      await window.FieldPhotoStorage.obtenerFotosPendientes();

    if (!pendientes.length) {
      return {
        success: true,
        empty: true,
        message: "No hay fotografías pendientes."
      };
    }

    sincronizacionEnCurso = true;

    try {
      return await sincronizarRegistro(pendientes[0].recordId);
    } finally {
      sincronizacionEnCurso = false;
    }
  }

  function estaSincronizando() {
    return sincronizacionEnCurso;
  }

  window.FieldPhotoSync = {
    obtenerUrl,
    tieneUrlConfigurada,
    guardarUrl,
    borrarUrl,
    configurarConDialogo,
    blobABase64,
    construirPayload,
    enviarRegistro,
    sincronizarRegistro,
    sincronizarPrimeraPendiente,
    estaSincronizando
  };

  console.log(
    tieneUrlConfigurada()
      ? "Field Photo Sync preparado y configurado."
      : "Field Photo Sync preparado; falta configurar la URL en este dispositivo."
  );
})();
