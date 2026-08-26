(function () {
  "use strict";

  const APP_VERSION = "v1.0";
  let eventoInstalacion = null;

  function esIOS() {
    return /iphone|ipad|ipod/i.test(
      window.navigator.userAgent
    );
  }

  function estaInstalada() {
    return (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone === true
    );
  }

  function crearInterfaz() {
    if (
      document.getElementById(
        "pwaBarraEstado"
      )
    ) {
      return;
    }

    const barra = document.createElement(
      "section"
    );

    barra.id = "pwaBarraEstado";
    barra.className = "pwa-barra-estado";

    barra.setAttribute(
      "aria-label",
      "Estado de la aplicación"
    );

    barra.innerHTML = `
      <div class="pwa-identidad">
        <span class="pwa-nombre">
          Field Trial Map
        </span>

        <span class="pwa-version">
          ${APP_VERSION}
        </span>
      </div>

      <div class="pwa-acciones">
        <span
          id="pwaEstadoConexion"
          class="pwa-conexion"
          role="status"
          aria-live="polite"
        ></span>

        <button
          id="pwaBotonInstalar"
          class="pwa-boton-instalar"
          type="button"
          hidden
        >
          <span aria-hidden="true">
            📱
          </span>

          Instalar App
        </button>

        <button
          id="pwaPruebaCamara"
          class="pwa-boton-instalar"
          type="button"
        >
          <span aria-hidden="true">
            📷
          </span>

          Probar cámara
        </button>
      </div>
    `;

    const encabezado =
      document.querySelector(
        ".encabezado"
      );

    if (encabezado) {
      encabezado.insertAdjacentElement(
        "afterend",
        barra
      );
    } else {
      document.body.insertAdjacentElement(
        "afterbegin",
        barra
      );
    }

    const botonInstalar =
      document.getElementById(
        "pwaBotonInstalar"
      );

    botonInstalar.addEventListener(
      "click",
      instalarAplicacion
    );

    const botonPruebaCamara =
      document.getElementById(
        "pwaPruebaCamara"
      );

    botonPruebaCamara.addEventListener(
      "click",
      () => {
        if (
          !window.FieldPhotoCapture ||
          typeof window.FieldPhotoCapture
            .abrirPanelCaptura !== "function"
        ) {
          console.error(
            "El módulo Field Photo Capture no está disponible."
          );

          return;
        }

        window.FieldPhotoCapture
          .abrirPanelCaptura({
            aoiId: "AOI-PRUEBA",
            location:
              "Localidad de prueba",
            crop: "Sunflower",
            photoType: "Trial"
          });
      }
    );

    actualizarEstadoConexion();
    actualizarBotonInstalacion();
  }

  function actualizarEstadoConexion() {
    const estado =
      document.getElementById(
        "pwaEstadoConexion"
      );

    if (!estado) {
      return;
    }

    const online = navigator.onLine;

    estado.className =
      `pwa-conexion ${
        online
          ? "pwa-online"
          : "pwa-offline"
      }`;

    estado.innerHTML = online
      ? `
        <span
          class="pwa-punto"
          aria-hidden="true"
        ></span>

        Online
      `
      : `
        <span
          class="pwa-punto"
          aria-hidden="true"
        ></span>

        Sin conexión
      `;
  }

  function actualizarBotonInstalacion() {
    const boton =
      document.getElementById(
        "pwaBotonInstalar"
      );

    if (!boton) {
      return;
    }

    if (estaInstalada()) {
      boton.hidden = true;
      return;
    }

    boton.hidden = !(
      eventoInstalacion ||
      esIOS()
    );
  }

  async function instalarAplicacion() {
    if (eventoInstalacion) {
      eventoInstalacion.prompt();

      await eventoInstalacion.userChoice;

      eventoInstalacion = null;

      actualizarBotonInstalacion();

      return;
    }

    if (esIOS()) {
      mostrarAyudaIOS();
    }
  }

  function mostrarAyudaIOS() {
    document
      .getElementById("pwaAyudaIOS")
      ?.remove();

    const fondo =
      document.createElement("div");

    fondo.id = "pwaAyudaIOS";
    fondo.className =
      "pwa-modal-fondo";

    fondo.innerHTML = `
      <section
        class="pwa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwaTituloIOS"
      >
        <button
          class="pwa-modal-cerrar"
          type="button"
          aria-label="Cerrar"
        >
          ×
        </button>

        <h2 id="pwaTituloIOS">
          Instalar en iPhone o iPad
        </h2>

        <ol>
          <li>
            Abrí el mapa con
            <strong>Safari</strong>.
          </li>

          <li>
            Tocá el botón
            <strong>Compartir</strong>.
          </li>

          <li>
            Elegí
            <strong>
              Agregar a pantalla de inicio
            </strong>.
          </li>

          <li>
            Confirmá con
            <strong>Agregar</strong>.
          </li>
        </ol>
      </section>
    `;

    document.body.appendChild(
      fondo
    );

    fondo
      .querySelector(
        ".pwa-modal-cerrar"
      )
      .addEventListener(
        "click",
        () => fondo.remove()
      );

    fondo.addEventListener(
      "click",
      evento => {
        if (
          evento.target === fondo
        ) {
          fondo.remove();
        }
      }
    );
  }

  window.addEventListener(
    "beforeinstallprompt",
    evento => {
      evento.preventDefault();

      eventoInstalacion =
        evento;

      actualizarBotonInstalacion();
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {
      eventoInstalacion =
        null;

      actualizarBotonInstalacion();
    }
  );

  window.addEventListener(
    "online",
    actualizarEstadoConexion
  );

  window.addEventListener(
    "offline",
    actualizarEstadoConexion
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      crearInterfaz
    );
  } else {
    crearInterfaz();
  }
})();
