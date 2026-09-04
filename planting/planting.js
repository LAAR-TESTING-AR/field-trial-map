console.log("Planting Tracker v2 - filtros dependientes");

const mapa = L.map("mapa").setView([-34.5, -63.0], 5);

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(mapa);

const capaMarcadores = L.layerGroup().addTo(mapa);

let sitios = [];
const URL_FLOW_SIEMBRA =
  "https://default3e20ecb29cb04df1ad7b914e31dcdd.a4.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/ba0bb4b2e7424a199e26e1bb9d749b37/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZH8hddf0UGFNdGOaV__Ao655IaUtxE6vcBNNaM_LaBs";

let modalSiembra;
let modalFechaSiembra;
let btnCancelarSiembra;
let btnGuardarSiembra;

document.addEventListener(
  "DOMContentLoaded",
  () => {

    modalSiembra =
      document.getElementById(
        "modalSiembra"
      );

    modalFechaSiembra =
      document.getElementById(
        "modalFechaSiembra"
      );

    btnCancelarSiembra =
      document.getElementById(
        "btnCancelarSiembra"
      );

    btnGuardarSiembra =
      document.getElementById(
        "btnGuardarSiembra"
      );

    if (btnCancelarSiembra) {
      btnCancelarSiembra.onclick =
        cerrarModalSiembra;
    }

    if (btnGuardarSiembra) {

btnGuardarSiembra.onclick =
  () => {

    const fecha =
      modalFechaSiembra.value;

    const aoiId =
      aoiPendienteSiembra;

    if (!fecha || !aoiId) {
      alert(
        "Seleccione una fecha de siembra"
      );

      return;
    }

    btnGuardarSiembra.disabled =
      true;

    btnGuardarSiembra.textContent =
      "Guardando...";

    /*
     * Primero guardamos localmente.
     * El registro ya es seguro aunque
     * desaparezca la conexión.
     */
    agregarSiembraPendiente(
      aoiId,
      fecha
    );

    /*
     * Actualización visual inmediata.
     */
    const sitioLocal =
      sitios.find(
        sitio =>
          limpiarTexto(
            sitio["AOI ID"]
          ) === aoiId
      );

    if (sitioLocal) {
      sitioLocal[
        "Planting Date (MM/DD/YYYY)"
      ] = fecha;
    }

    actualizarVista();

    btnGuardarSiembra.disabled =
      false;

    btnGuardarSiembra.textContent =
      "Guardar";

    cerrarModalSiembra();

    /*
     * No usamos await.
     * El usuario puede seguir trabajando
     * mientras se intenta sincronizar.
     */
    sincronizarSiembrasPendientes();
  };

    }

  }
);

const filtroCrop =
  document.getElementById("filtroCrop");

const filtroSeason =
  document.getElementById("filtroSeason");

const filtroLaar =
  document.getElementById("filtroLaar");

const filtroOperation =
  document.getElementById("filtroOperation");
const busqueda =
  document.getElementById("busqueda");

const limpiarFiltros =
  document.getElementById("limpiarFiltros");

const configuracionFiltros = [
  {
    elemento: filtroCrop,
    campo: "Crop",
    textoInicial: "Todos los cultivos"
  },
  {
    elemento: filtroSeason,
    campo: "Season",
    textoInicial: "Todas las seasons"
  },
  {
    elemento: filtroLaar,
    campo: "LAAR Status 2026-2027",
    textoInicial: "Todos los LAAR Status"
  },
  {
    elemento: filtroOperation,
    campo: "Operations",
    textoInicial: "Todas las operaciones"
  }
];

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}
function normalizarTexto(valor) {
  return limpiarTexto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coincideConBusqueda(sitio) {
  const palabras = normalizarTexto(busqueda.value)
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) {
    return true;
  }

  const contenidoCompleto = Object.values(sitio)
    .map(normalizarTexto)
    .join(" ");

  return palabras.every(palabra =>
    contenidoCompleto.includes(palabra)
  );
}

function ordenarValores(valores) {
  return [...new Set(
    valores
      .map(limpiarTexto)
      .filter(Boolean)
  )].sort((a, b) =>
    a.localeCompare(
      b,
      "es",
      { sensitivity: "base" }
    )
  );
}

function esDrop(sitio) {
  return limpiarTexto(sitio.Description)
    .toLowerCase()
    .includes("drop");
}

function estaSembrado(sitio) {
  return Boolean(
    limpiarTexto(
      sitio["Planting Date (MM/DD/YYYY)"]
    )
  );
}

function coincideConFiltros(
  sitio,
  campoIgnorado = null
) {
  return configuracionFiltros.every(
    ({ elemento, campo }) => {
      if (campo === campoIgnorado) {
        return true;
      }

      const valorSeleccionado =
        limpiarTexto(elemento.value);

      return (
        !valorSeleccionado ||
        limpiarTexto(sitio[campo]) === valorSeleccionado
      );
    }
  );
}

function obtenerSitiosFiltrados() {
  return sitios.filter(sitio =>
    coincideConBusqueda(sitio) &&
    coincideConFiltros(sitio)
  );
}


function obtenerValoresDisponibles(campo) {
  return ordenarValores(
    sitios
      .filter(sitio =>
        coincideConBusqueda(sitio) &&
        coincideConFiltros(sitio, campo)
      )
      .map(sitio => sitio[campo])
  );
}


function reconstruirFiltro(
  elemento,
  valores,
  textoInicial
) {
  const valorActual = elemento.value;

  elemento.innerHTML = "";

  const opcionTodos =
    document.createElement("option");

  opcionTodos.value = "";
  opcionTodos.textContent = textoInicial;

  elemento.appendChild(opcionTodos);

  valores.forEach(valor => {
    const opcion =
      document.createElement("option");

    opcion.value = valor;
    opcion.textContent = valor;

    elemento.appendChild(opcion);
  });

  if (valores.includes(valorActual)) {
    elemento.value = valorActual;
  } else {
    elemento.value = "";
  }
}

function actualizarFiltrosDependientes() {
  configuracionFiltros.forEach(
    ({ elemento, campo, textoInicial }) => {
      reconstruirFiltro(
        elemento,
        obtenerValoresDisponibles(campo),
        textoInicial
      );
    }
  );
}

function actualizarDashboard(sitiosFiltrados) {
  const drops = sitiosFiltrados.filter(
    esDrop
  ).length;

  const sembradas = sitiosFiltrados.filter(
    sitio =>
      !esDrop(sitio) &&
      estaSembrado(sitio)
  ).length;

  const pendientes = sitiosFiltrados.filter(
    sitio =>
      !esDrop(sitio) &&
      !estaSembrado(sitio)
  ).length;

  const totalOperativo =
    sembradas + pendientes;

  const avance =
    totalOperativo > 0
      ? Math.round(
          (sembradas / totalOperativo) * 100
        )
      : 0;

  document.getElementById("totalAOI").textContent =
    sitiosFiltrados.length;

  document.getElementById("sembradas").textContent =
    sembradas;

  document.getElementById("pendientes").textContent =
    pendientes;

  document.getElementById("drop").textContent =
    drops;

  document.getElementById("avanceGrande").textContent =
  `${avance}%`;

document.getElementById("barraAvance").style.width =
  `${avance}%`;

}

function crearPopup(sitio, estado) {

  const aoiId =
    limpiarTexto(
      sitio["AOI ID"]
    );

  const plantingDate =
    limpiarTexto(
      sitio["Planting Date (MM/DD/YYYY)"]
    );

  let bloqueAccion = "";

  if (estado === "PENDIENTE") {

    bloqueAccion = `

      <hr>

      <button
  type="button"
  class="btn-registrar-siembra"
  data-aoi="${aoiId}">
  Registrar Siembra
</button>

    `;

  } else if (estado === "SEMBRADO") {

    bloqueAccion = `

      <hr>

      <div class="popup-fecha-registrada">

        <strong>
          Fecha de siembra
        </strong>

        <br>

        ${plantingDate}

      </div>

    `;

  }

  return `

    <div class="popup-planting">

      <div class="popup-aoi">

        ${aoiId}

      </div>

      <div class="popup-info">

        ${limpiarTexto(
          sitio.Location
        )}

        <br>

        ${limpiarTexto(
          sitio.Crop
        )}

        <br>

        ${limpiarTexto(
          sitio.Season
        )}

        <br>

        ${limpiarTexto(
          sitio["LAAR Status 2026-2027"]
        )}

        <br>

        ${limpiarTexto(
          sitio.Operations
        )}

      </div>

      <div class="popup-estado">

        Estado: ${estado}

      </div>

      ${bloqueAccion}

    </div>

  `;
}


function actualizarMapa(sitiosFiltrados) {
  capaMarcadores.clearLayers();

  const coordenadas = [];

  sitiosFiltrados.forEach(sitio => {
    const lat = Number(
      sitio["Latitude Trial"]
    );

    const lon = Number(
      sitio["Longitude Trial"]
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      return;
    }

    const drop = esDrop(sitio);
    const sembrado = estaSembrado(sitio);

    let color = "#d32f2f";
    let estado = "PENDIENTE";

    if (drop) {
      color = "#000000";
      estado = "DROP";
    } else if (sembrado) {
      color = "#2e7d32";
      estado = "SEMBRADO";
    }

    const marcador = L.circleMarker(
      [lat, lon],
      {
        radius: 8,
        fillColor: color,
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.95
      }
    );

marcador.bindPopup(
  crearPopup(sitio, estado)
);

marcador.on(
  "popupopen",
  () => {

    const aoiId =
      limpiarTexto(
        sitio["AOI ID"]
      );

    const boton =
      document.querySelector(
        `.btn-registrar-siembra[data-aoi="${aoiId}"]`
      );

    if (!boton) {
      return;
    }

    boton.onclick =
      async () => {

  abrirModalSiembra(
  aoiId
);

return;

if (
  !fecha ||
  fecha.trim() === ""
) {
  return;
}
      
        boton.disabled = true;
        boton.textContent =
          "Registrando...";

        const ok =
          await registrarSiembra(
            aoiId,
            fecha
          );

        if (ok) {

          alert(
            "Siembra registrada correctamente"
          );

        } else {

          alert(
            "Error registrando siembra"
          );

          boton.disabled = false;

          boton.textContent =
            "Registrar Siembra";

        }

      };

  }
);

marcador.addTo(capaMarcadores);

    coordenadas.push([lat, lon]);
  });

  if (coordenadas.length > 0) {
    mapa.fitBounds(
      coordenadas,
      {
        padding: [30, 30],
        maxZoom: 9
      }
    );
  }
}

function actualizarVista() {
  actualizarFiltrosDependientes();

  const sitiosFiltrados =
    obtenerSitiosFiltrados();

  actualizarDashboard(sitiosFiltrados);
  actualizarMapa(sitiosFiltrados);
}

configuracionFiltros.forEach(
  ({ elemento }) => {
    elemento.addEventListener(
      "change",
      actualizarVista
    );
  }
);
busqueda.addEventListener(
  "input",
  actualizarVista
);

limpiarFiltros.addEventListener(
  "click",
  () => {
    busqueda.value = "";

    configuracionFiltros.forEach(
      ({ elemento }) => {
        elemento.value = "";
      }
    );

    actualizarVista();
  }
);


Papa.parse("../Sitios.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,

  transformHeader: encabezado =>
    limpiarTexto(
      encabezado.replace(/^\uFEFF/, "")
    ),

  complete: resultado => {
    sitios = resultado.data.filter(
      sitio =>
        limpiarTexto(sitio["AOI ID"]) &&
        limpiarTexto(sitio.Location)
    );

    console.log(
      `Sitios cargados: ${sitios.length}`
    );

    actualizarVista();

reconciliarPendientesConSitios(
  sitios
);

sincronizarSiembrasPendientes();

if (resultado.errors.length) {
      console.warn(
        "Advertencias del CSV:",
        resultado.errors
      );
    }
  },

  error: error => {
    console.error(
      "Error cargando Sitios.csv:",
      error
    );
  }
});
const botonLeyenda =
  document.getElementById("botonLeyenda");

const panelLeyenda =
  document.getElementById("panelLeyenda");

botonLeyenda.addEventListener(
  "click",
  () => {
    panelLeyenda.classList.toggle("visible");
  }
);
let aoiPendienteSiembra = null;

function abrirModalSiembra(
  aoiId
) {
console.log(
  "Abriendo modal",
  aoiId
);
  aoiPendienteSiembra =
    aoiId;

  modalFechaSiembra.value =
    new Date()
      .toISOString()
      .split("T")[0];

  modalSiembra.classList.add(
    "visible"
  );

}

function cerrarModalSiembra() {

  modalSiembra.classList.remove(
    "visible"
  );

  aoiPendienteSiembra =
    null;

}


window.addEventListener(
  "online",
  async () => {

    console.log(
      "Sincronizando siembras pendientes..."
    );

    await sincronizarSiembrasPendientes();

  }
);
