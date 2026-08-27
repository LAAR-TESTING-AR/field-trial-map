(function () {
  "use strict";

  const STORAGE_KEY = "fieldTrialMapPowerAutomateUrl";

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
        detail: {
          configured: true
        }
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
        detail: {
          configured: false
        }
      })
    );

    console.log(
      "Configuración local de sincronización eliminada."
    );
  }

  function configurarConDialogo() {
    const actual = obtenerUrl();

    const ingresada = window.prompt(
      "Pegá la URL HTTP de Power Automate para este dispositivo. La dirección quedará guardada solamente de forma local.",
      actual
    );

    if (ingresada === null) {
      return false;
    }

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

  window.FieldPhotoSync = {
    obtenerUrl,
    tieneUrlConfigurada,
    guardarUrl,
    borrarUrl,
    configurarConDialogo
  };

  console.log(
    tieneUrlConfigurada()
      ? "Field Photo Sync preparado y configurado."
      : "Field Photo Sync preparado; falta configurar la URL en este dispositivo."
  );
})();
