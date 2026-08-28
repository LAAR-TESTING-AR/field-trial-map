(function () {
  "use strict";

  const TARGET_ACCURACY_METERS = 15;
  const ACCEPTABLE_ACCURACY_METERS = 30;
  const MAXIMUM_ACCURACY_METERS = 100;
  const CAPTURE_TIMEOUT_MS = 30000;

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function numero(valor) {
    if (valor === null || valor === undefined || valor === "") {
      return null;
    }

    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : null;
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
    const coordenada = numero(valor);
    return coordenada === null ? "No disponible" : coordenada.toFixed(6);
  }

  function formatearMetros(valor) {
    const metros = numero(valor);
    return metros === null ? "No disponible" : `${Math.round(metros)} m`;
  }

  function radianes(grados) {
    return grados * Math.PI / 180;
  }

  function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const valores = [lat1, lon1, lat2, lon2].map(numero);

    if (valores.some(valor => valor === null)) {
      return null;
    }

    const [latitude1, longitude1, latitude2, longitude2] = valores;
    const radioTierra = 6371000;
    const diferenciaLatitud = radianes(latitude2 - latitude1);
    const diferenciaLongitud = radianes(longitude2 - longitude1);

    const a =
      Math.sin(diferenciaLatitud / 2) ** 2 +
      Math.cos(radianes(latitude1)) *
        Math.cos(radianes(latitude2)) *
        Math.sin(diferenciaLongitud / 2) ** 2;

    return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function crearRecordId(aoiId, pointType) {
    const fecha = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

    const aoiSeguro = texto(aoiId || "SIN-AOI")
      .replace(/[^a-zA-Z0-9_-]+/g, "-");

    return `gps-${aoiSeguro}-${pointType}-${fecha}`;
  }

  function clasePrecision(accuracy) {
    if (accuracy <= TARGET_ACCURACY_METERS) return "excelente";
    if (accuracy <= ACCEPTABLE_ACCURACY_METERS) return "aceptable";
    return "baja";
  }

  function mensajePrecision(accuracy) {
    if (accuracy <= TARGET_ACCURACY_METERS) {
      return "Precisión excelente. La ubicación está lista para guardar.";
    }

    if (accuracy <= ACCEPTABLE_ACCURACY_METERS) {
      return "Precisión aceptable. Podés guardar o volver a medir.";
    }

    if (accuracy <= MAXIMUM_ACCURACY_METERS) {
      return "Precisión baja. Esperá unos segundos o volvé a medir antes de guardar.";
    }

    return "Precisión insuficiente. No se recomienda guardar esta lectura.";
  }

  function obtenerMensajeErrorGPS(error) {
    if (!error) return "No fue posible obtener la ubicación.";

    if (error.code === 1) {
      return "El permiso de ubicación fue rechazado. Habilitá la ubicación para esta PWA desde la configuración del dispositivo.";
    }

    if (error.code === 2) {
      return "El dispositivo no pudo determinar la ubicación. Verificá que el GPS esté activado y que tengas cielo abierto.";
    }

    if (error.code === 3) {
      return "La medición demoró demasiado. Volvé a intentar y esperá unos segundos.";
    }

    return error.message || "No fue posible obtener la ubicación.";
  }

  function abrirPanelCaptura(configuracion = {}) {
    const sitio = {
      aoiId: texto(configuracion.aoiId),
      location: texto(configuracion.location),
      pointType:
        texto(configuracion.pointType).toLowerCase() === "access"
          ? "Access"
          : "Trial",
      previousLatitude: numero(configuracion.previousLatitude),
      previousLongitude: numero(configuracion.previousLongitude)
    };

    if (!sitio.aoiId) {
      window.alert("No se encontró el AOI ID del sitio.");
      return;
    }

    if (!("geolocation" in navigator)) {
      window.alert("Este dispositivo no permite capturar la ubicación GPS.");
      return;
    }

    document.getElementById("fieldCoordinateModal")?.remove();

    const fondo = document.createElement("div");
    fondo.id = "fieldCoordinateModal";
    fondo.className = "field-coordinate-modal-fondo";

    fondo.innerHTML = `
      <section
        class="field-coordinate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fieldCoordinateTitle"
      >
        <button
          class="field-coordinate-close"
          type="button"
          aria-label="Cerrar captura de ubicación"
        >×</button>

        <h2 id="fieldCoordinateTitle">
          Actualizar ubicación del ${escaparHTML(sitio.pointType)}
        </h2>

        <p class="field-coordinate-context">
          <strong>${escaparHTML(sitio.location || "Localidad")}</strong>
          · AOI ID: ${escaparHTML(sitio.aoiId)}
        </p>

        <div class="field-coordinate-current">
          <h3>Coordenada actual</h3>
          <p>Latitud: <strong>${formatearCoordenada(sitio.previousLatitude)}</strong></p>
          <p>Longitud: <strong>${formatearCoordenada(sitio.previousLongitude)}</strong></p>
        </div>

        <div class="field-coordinate-capture">
          <h3>Nueva medición</h3>

          <div id="fieldCoordinateStatus" class="field-coordinate-status">
            Presioná “Medir ubicación” y permanecé en el punto correcto.
          </div>

          <div id="fieldCoordinateResult" class="field-coordinate-result" hidden>
            <p>Latitud: <strong id="fieldCoordinateLatitude">-</strong></p>
            <p>Longitud: <strong id="fieldCoordinateLongitude">-</strong></p>
            <p>Precisión: <strong id="fieldCoordinateAccuracy">-</strong></p>
            <p>Desplazamiento: <strong id="fieldCoordinateDistance">-</strong></p>
          </div>
        </div>

        <div class="field-coordinate-actions">
          <button
            id="fieldCoordinateMeasure"
            class="field-coordinate-measure"
            type="button"
          >
            📍 Medir ubicación
          </button>

          <button
            id="fieldCoordinateSave"
            class="field-coordinate-save"
            type="button"
            disabled
          >
            Guardar ubicación en el dispositivo
          </button>

          <button
            class="field-coordinate-cancel"
            type="button"
          >
            Cancelar
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(fondo);
    document.body.style.overflow = "hidden";

    const botonMedir = fondo.querySelector("#fieldCoordinateMeasure");
    const botonGuardar = fondo.querySelector("#fieldCoordinateSave");
    const estado = fondo.querySelector("#fieldCoordinateStatus");
    const resultado = fondo.querySelector("#fieldCoordinateResult");
    const latitudeElement = fondo.querySelector("#fieldCoordinateLatitude");
    const longitudeElement = fondo.querySelector("#fieldCoordinateLongitude");
    const accuracyElement = fondo.querySelector("#fieldCoordinateAccuracy");
    const distanceElement = fondo.querySelector("#fieldCoordinateDistance");

    let watchId = null;
    let timeoutId = null;
    let mejorLectura = null;
    let guardando = false;

    function detenerMedicion() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function cerrarPanel() {
      if (guardando) return;
      detenerMedicion();
      fondo.remove();
      document.body.style.overflow = "";
    }

    function mostrarEstado(mensaje, tipo = "") {
      estado.textContent = mensaje;
      estado.className = "field-coordinate-status";

      if (tipo) {
        estado.classList.add(`field-coordinate-status-${tipo}`);
      }
    }

    function mostrarLectura(lectura) {
      const distancia = calcularDistanciaMetros(
        sitio.previousLatitude,
        sitio.previousLongitude,
        lectura.latitude,
        lectura.longitude
      );

      resultado.hidden = false;
      latitudeElement.textContent = formatearCoordenada(lectura.latitude);
      longitudeElement.textContent = formatearCoordenada(lectura.longitude);
      accuracyElement.textContent = formatearMetros(lectura.accuracy);
      distanceElement.textContent = formatearMetros(distancia);

      const tipoPrecision = clasePrecision(lectura.accuracy);
      mostrarEstado(mensajePrecision(lectura.accuracy), tipoPrecision);

      botonGuardar.disabled = lectura.accuracy > MAXIMUM_ACCURACY_METERS;
    }

    function procesarPosicion(posicion) {
      const lectura = {
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
        accuracy: posicion.coords.accuracy,
        altitude: numero(posicion.coords.altitude),
        altitudeAccuracy: numero(posicion.coords.altitudeAccuracy),
        heading: numero(posicion.coords.heading),
        speed: numero(posicion.coords.speed),
        measuredAt: new Date(posicion.timestamp).toISOString()
      };

      if (
        !mejorLectura ||
        lectura.accuracy < mejorLectura.accuracy
      ) {
        mejorLectura = lectura;
        mostrarLectura(mejorLectura);
      }

      if (mejorLectura.accuracy <= TARGET_ACCURACY_METERS) {
        detenerMedicion();
        botonMedir.disabled = false;
        botonMedir.textContent = "📍 Volver a medir";
      }
    }

    function procesarError(error) {
      detenerMedicion();
      botonMedir.disabled = false;
      botonMedir.textContent = "📍 Volver a medir";
      mostrarEstado(obtenerMensajeErrorGPS(error), "error");
    }

    function iniciarMedicion() {
      detenerMedicion();
      mejorLectura = null;
      resultado.hidden = true;
      botonGuardar.disabled = true;
      botonMedir.disabled = true;
      botonMedir.textContent = "Midiendo ubicación...";

      mostrarEstado(
        "Buscando señal GPS. Permanecé quieto y, si es posible, con cielo abierto.",
        "midiendo"
      );

      watchId = navigator.geolocation.watchPosition(
        procesarPosicion,
        procesarError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: CAPTURE_TIMEOUT_MS
        }
      );

      timeoutId = window.setTimeout(() => {
        detenerMedicion();
        botonMedir.disabled = false;
        botonMedir.textContent = "📍 Volver a medir";

        if (mejorLectura) {
          mostrarLectura(mejorLectura);
        } else {
          mostrarEstado(
            "No se obtuvo una lectura dentro del tiempo esperado. Volvé a intentar.",
            "error"
          );
        }
      }, CAPTURE_TIMEOUT_MS + 1000);
    }

    fondo
      .querySelector(".field-coordinate-close")
      .addEventListener("click", cerrarPanel);

    fondo
      .querySelector(".field-coordinate-cancel")
      .addEventListener("click", cerrarPanel);

    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) cerrarPanel();
    });

    botonMedir.addEventListener("click", iniciarMedicion);

    botonGuardar.addEventListener("click", async () => {
      if (!mejorLectura) {
        mostrarEstado(
          "Primero medí la ubicación del dispositivo.",
          "error"
        );
        return;
      }

      if (mejorLectura.accuracy > MAXIMUM_ACCURACY_METERS) {
        mostrarEstado(
          "La precisión es insuficiente. Volvé a medir antes de guardar.",
          "error"
        );
        return;
      }

      if (
        !window.FieldCoordinateStorage ||
        typeof window.FieldCoordinateStorage
          .reemplazarPendienteDelMismoPunto !== "function"
      ) {
        mostrarEstado(
          "El almacenamiento offline de coordenadas no está disponible.",
          "error"
        );
        return;
      }

      detenerMedicion();
      guardando = true;
      botonGuardar.disabled = true;
      botonMedir.disabled = true;
      botonGuardar.textContent = "Guardando ubicación...";

      try {
        const captura = {
          recordId: crearRecordId(sitio.aoiId, sitio.pointType),
          aoiId: sitio.aoiId,
          location: sitio.location,
          pointType: sitio.pointType,
          latitude: mejorLectura.latitude,
          longitude: mejorLectura.longitude,
          accuracy: mejorLectura.accuracy,
          altitude: mejorLectura.altitude,
          altitudeAccuracy: mejorLectura.altitudeAccuracy,
          heading: mejorLectura.heading,
          speed: mejorLectura.speed,
          measuredAt: mejorLectura.measuredAt,
          previousLatitude: sitio.previousLatitude,
          previousLongitude: sitio.previousLongitude,
          captureDate: new Date().toISOString(),
          syncStatus: "pending",
          syncAttempts: 0
        };

        await window.FieldCoordinateStorage
          .reemplazarPendienteDelMismoPunto(captura);

        const cantidadPendientes =
          await window.FieldCoordinateStorage
            .contarCoordenadasPendientes();

        window.dispatchEvent(
          new CustomEvent("fieldcoordinates:pending-updated", {
            detail: {
              count: cantidadPendientes,
              recordId: captura.recordId,
              aoiId: captura.aoiId,
              pointType: captura.pointType
            }
          })
        );

        mostrarEstado(
          `Ubicación guardada en el dispositivo. Coordenadas pendientes: ${cantidadPendientes}.`,
          "guardado"
        );

        botonGuardar.textContent = "Ubicación guardada";

        console.log("Coordenada guardada localmente:", {
          recordId: captura.recordId,
          aoiId: captura.aoiId,
          pointType: captura.pointType,
          latitude: captura.latitude,
          longitude: captura.longitude,
          accuracy: captura.accuracy,
          pendingCoordinates: cantidadPendientes
        });

        window.setTimeout(() => {
          guardando = false;
          cerrarPanel();
        }, 1800);
      } catch (error) {
        console.error("Error al guardar la coordenada:", error);
        guardando = false;
        botonGuardar.disabled = false;
        botonMedir.disabled = false;
        botonGuardar.textContent = "Guardar ubicación en el dispositivo";
        botonMedir.textContent = "📍 Volver a medir";

        mostrarEstado(
          error?.message || "No fue posible guardar la coordenada.",
          "error"
        );
      }
    });
  }

  window.FieldCoordinateCapture = {
    abrirPanelCaptura,
    calcularDistanciaMetros
  };

  console.log("Captura GPS de coordenadas preparada.");
})();
