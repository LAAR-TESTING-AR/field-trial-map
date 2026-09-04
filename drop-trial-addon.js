(function () {
  "use strict";

  function esTrialDrop(sitio) {
    return String(sitio?.description ?? "")
      .trim()
      .toLowerCase()
      .includes("drop");
  }

  function busquedaEspecial() {
    return typeof window.obtenerBusquedaEspecial === "function"
      ? window.obtenerBusquedaEspecial()
      : "";
  }

  const crearIconoTrialOriginal = window.crearIconoTrial;
  const crearPopupTrialOriginal = window.crearPopupTrial;
  const actualizarLeyendaOriginal = window.actualizarLeyenda;

  if (
    typeof crearIconoTrialOriginal !== "function" ||
    typeof crearPopupTrialOriginal !== "function" ||
    typeof actualizarLeyendaOriginal !== "function"
  ) {
    console.error("drop-trial-addon.js debe cargarse después de app.js.");
    return;
  }

  window.crearIconoTrial = function (cultivo, sitio) {
    if (!esTrialDrop(sitio)) return crearIconoTrialOriginal(cultivo);

    const cfg = configuracionCultivo(cultivo);
    return L.divIcon({
      className: "marcador-drop-contenedor",
      html: `
        <span class="marcador-drop cultivo-${cfg.tipo}" aria-label="Trial Drop - No visitar">
          <span class="icono-drop-cultivo">${cfg.icono}</span>
          <span class="equis-drop" aria-hidden="true">×</span>
        </span>
      `,
      iconSize: [42, 48],
      iconAnchor: [21, 48],
      popupAnchor: [0, -45]
    });
  };

  window.crearPopupTrial = function (sitio) {
    let html = crearPopupTrialOriginal(sitio);
    if (!esTrialDrop(sitio)) return html;

    const aviso = `
      <div class="aviso-trial-drop" role="status">
        <strong>DROP - NO VISITAR</strong>
        ${sitio.description ? `<span>${escaparHTML(sitio.description)}</span>` : ""}
      </div>
    `;

    html = html.replace(
      '<div class="popup-detalles">',
      `${aviso}<div class="popup-detalles">`
    );

    html = html.replace(
      /<div class="botones-navegacion">[\s\S]*?<\/div>\s*<\/div>$/,
      "</div>"
    );

    return html;
  };

  window.actualizarLeyenda = function (sitiosFiltrados) {
    actualizarLeyendaOriginal(sitiosFiltrados);

    const hayDrop = sitiosFiltrados.some(
      sitio => tieneTrial(sitio) && esTrialDrop(sitio)
    );

    if (!hayDrop || !contenidoLeyenda) return;

    contenidoLeyenda.insertAdjacentHTML(
      "beforeend",
      `
        <div class="item-leyenda item-leyenda-drop">
          <span class="muestra-drop-leyenda" aria-hidden="true"><span>×</span></span>
          <span>Trial Drop - No visitar</span>
        </div>
      `
    );
  };

  window.actualizarMapa = function () {

  capaMarcadores.clearLayers();

  const sitiosFiltrados = sitios.filter(
    coincideConFiltros
  );

  const coordenadas = [];

  const modo = busquedaEspecial();

  let cantidadTrials = 0;
  let cantidadAccess = 0;
  let cantidadDrop = 0;
  let cantidadSembrados = 0;

  sitiosFiltrados.forEach(sitio => {

    const esDrop = esTrialDrop(sitio);

    const mostrarTrial =
      tieneTrial(sitio) &&
      modo !== "access" &&
      (modo !== "drop" || esDrop);

    const mostrarAccess =
      tieneAccess(sitio) &&
      modo !== "trial" &&
      modo !== "drop";

    if (mostrarTrial) {

      let iconoTrial;

if (esDrop) {

  iconoTrial = window.crearIconoTrial(
    sitio.crop,
    sitio
  );

} else if (
  window.vistaMapaActual === "planting"
) {

  iconoTrial = crearIconoSiembra(
    estaSembrado(sitio)
  );

} else {

  iconoTrial = window.crearIconoTrial(
    sitio.crop,
    sitio
  );

}

      L.marker(
        [
          sitio.latitudeTrial,
          sitio.longitudeTrial
        ],
        {
          icon: iconoTrial
        }
      )
        .bindPopup(
          window.crearPopupTrial(sitio),
          {
            maxWidth: 390,
            minWidth: 285,
            maxHeight: 700,
            autoPan: true,
            autoPanPadding: [50, 120]
          }
        )
        .addTo(capaMarcadores);

      coordenadas.push([
        sitio.latitudeTrial,
        sitio.longitudeTrial
      ]);

      cantidadTrials += 1;

      if (esDrop) {

        cantidadDrop += 1;

      } else if (
        estaSembrado(sitio)
      ) {

        cantidadSembrados += 1;

      }

    } // cierre mostrarTrial

    if (mostrarAccess) {

      const sitioAccess = {
        ...sitio,
        latitude: sitio.latitudeAccess,
        longitude: sitio.longitudeAccess
      };

      L.marker(
        [
          sitio.latitudeAccess,
          sitio.longitudeAccess
        ],
        {
          icon: crearIconoAccess(),
          zIndexOffset: 1000
        }
      )
        .bindPopup(
          crearPopupAccess(sitioAccess),
          {
            maxWidth: 390,
            minWidth: 285,
            maxHeight: 700,
            autoPan: true,
            autoPanPadding: [50, 120],
            sitioAccess
          }
        )
        .addTo(capaMarcadores);

      coordenadas.push([
        sitio.latitudeAccess,
        sitio.longitudeAccess
      ]);

      cantidadAccess += 1;

    }

  });

  const total =
    cantidadTrials + cantidadAccess;
const kpiTotalAOI =
  document.getElementById(
    "kpiTotalAOI"
  );

const kpiTrials =
  document.getElementById(
    "kpiTrials"
  );

const kpiAccess =
  document.getElementById(
    "kpiAccess"
  );

const kpiDrop =
  document.getElementById(
    "kpiDrop"
  );

if (kpiTotalAOI)
  kpiTotalAOI.textContent =
    total;

if (kpiTrials)
  kpiTrials.textContent =
    cantidadTrials;

if (kpiAccess)
  kpiAccess.textContent =
    cantidadAccess;

if (kpiDrop)
  kpiDrop.textContent =
    cantidadDrop;
  if (
    window.vistaMapaActual === "planting"
  ) {

    const trialsValidos =
      cantidadTrials - cantidadDrop;

    const pendientes =
      trialsValidos - cantidadSembrados;

    const porcentaje =
      trialsValidos > 0
        ? Math.round(
            (
              cantidadSembrados /
              trialsValidos
            ) * 100
          )
        : 0;
  }
window.actualizarLeyenda(sitiosFiltrados);

    if (coordenadas.length) {
      mapa.fitBounds(coordenadas, { padding: [30, 30], maxZoom: 10 });
    }
  };

  console.log("Visualización de Trials Drop y búsqueda por tipo habilitadas.");
})
