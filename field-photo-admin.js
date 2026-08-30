(function () {
  "use strict";

  const STORAGE_KEY = "fieldTrialMapAdminDeleteVisitUrl";
  const ADMIN_MODE =
    new URLSearchParams(window.location.search).get("mode") === "admin";

  let contextoHistorial = null;
  let observer = null;
  let procesandoVisitId = "";

  if (!ADMIN_MODE) {
    return;
  }

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function obtenerUrl() {
    return texto(window.localStorage.getItem(STORAGE_KEY));
  }

  function validarUrl(valor) {
    const urlTexto = texto(valor);
    if (!urlTexto) {
      throw new Error("La URL del flujo no puede quedar vacía.");
    }

    let url;
    try {
      url = new URL(urlTexto);
    } catch (_) {
      throw new Error("La dirección ingresada no es una URL válida.");
    }

    if (url.protocol !== "https:") {
      throw new Error("La URL debe comenzar con https://");
    }

    return url.href;
  }

  function configurarUrl() {
    const ingresada = window.prompt(
      "Pegá la URL HTTP del flujo FieldPhoto_DeleteVisit. Quedará guardada solamente en este dispositivo.",
      obtenerUrl()
    );

    if (ingresada === null) return false;

    try {
      window.localStorage.setItem(STORAGE_KEY, validarUrl(ingresada));
      window.alert("URL administrativa guardada en este dispositivo.");
      return true;
    } catch (error) {
      window.alert(error?.message || "No fue posible guardar la URL.");
      return false;
    }
  }

  function formatearFecha(valor) {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(fecha);
  }

  async function eliminarVisita(visita, boton) {
    const visitId = texto(visita?.visitId);
    if (!visitId || procesandoVisitId) return;

    if (!obtenerUrl() && !configurarUrl()) return;

    const cantidadFotos = Array.isArray(visita.photos)
      ? visita.photos.length
      : 0;

    const confirmar = window.confirm(
      [
        "¿Eliminar definitivamente esta visita?",
        "",
        `Localidad: ${texto(visita.location) || "Sin localidad"}`,
        `Fecha: ${formatearFecha(visita.captureDate)}`,
        `Fotografías: ${cantidadFotos}`,
        "",
        "La visita y todas sus fotografías se eliminarán de SharePoint y del historial publicado."
      ].join("\n")
    );

    if (!confirmar) return;

    procesandoVisitId = visitId;
    const textoAnterior = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Eliminando visita...";

    try {
      const response = await fetch(obtenerUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({ visitId }),
        cache: "no-store",
        credentials: "omit"
      });

      const contenido = await response.text();
      let respuesta = {};

      if (contenido) {
        try {
          respuesta = JSON.parse(contenido);
        } catch (_) {
          respuesta = { message: contenido };
        }
      }

      if (!response.ok || respuesta?.success !== true) {
        throw new Error(
          respuesta?.message ||
          `Power Automate respondió con estado ${response.status}.`
        );
      }

      await window.FieldPhotoHistory.cargarHistorial(true);

      if (
        window.FieldPhotoHistoryUI &&
        typeof window.FieldPhotoHistoryUI.actualizarHistorialAbierto === "function"
      ) {
        await window.FieldPhotoHistoryUI.actualizarHistorialAbierto();
      }

      window.alert("Visita eliminada correctamente.");
    } catch (error) {
      console.error("No fue posible eliminar la visita:", error);
      window.alert(
        error?.message || "No fue posible eliminar la visita."
      );

      boton.disabled = false;
      boton.textContent = textoAnterior;
    } finally {
      procesandoVisitId = "";
    }
  }

  async function incorporarBotones() {
    const modal = document.getElementById("fieldHistoryModal");
    if (!modal || !contextoHistorial || procesandoVisitId) return;

    if (
      !window.FieldPhotoHistory ||
      typeof window.FieldPhotoHistory.obtenerVisitas !== "function"
    ) {
      return;
    }

    const tarjetas = [...modal.querySelectorAll(".field-history-visita")];
    if (!tarjetas.length) return;

    try {
      const visitas = await window.FieldPhotoHistory.obtenerVisitas(
        contextoHistorial.aoiId,
        contextoHistorial.photoType
      );

      tarjetas.forEach((tarjeta, indice) => {
        if (tarjeta.querySelector(".field-admin-delete-visit")) return;

        const visita = visitas[indice];
        if (!texto(visita?.visitId)) return;

        const acciones = document.createElement("div");
        acciones.className = "field-admin-visit-actions";

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "field-admin-delete-visit";
        boton.textContent = "Eliminar visita";
        boton.setAttribute(
          "aria-label",
          `Eliminar visita del ${formatearFecha(visita.captureDate)}`
        );

        boton.addEventListener("click", () => {
          eliminarVisita(visita, boton);
        });

        acciones.appendChild(boton);
        tarjeta.appendChild(acciones);
      });
    } catch (error) {
      console.warn("No fue posible preparar los controles administrativos:", error);
    }
  }

  document.addEventListener(
    "click",
    evento => {
      const boton = evento.target.closest('[data-field-history-open="true"]');
      if (!boton) return;

      contextoHistorial = {
        aoiId: texto(boton.dataset.aoiId),
        photoType: texto(boton.dataset.photoType || "Trial")
      };

      window.setTimeout(incorporarBotones, 250);
    },
    true
  );

  function iniciarObservador() {
    if (observer) return;

    observer = new MutationObserver(() => {
      window.setTimeout(incorporarBotones, 0);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  window.FieldPhotoAdmin = {
    configurarUrl,
    obtenerUrl,
    incorporarBotones
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarObservador, {
      once: true
    });
  } else {
    iniciarObservador();
  }

  console.log("Administración de visitas habilitada en este dispositivo.");
})();
