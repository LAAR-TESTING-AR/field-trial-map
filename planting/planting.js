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

function generarDatosTimeline(
  sitiosBase = sitios
) {

  const sembrados =
    sitiosBase.filter(
      sitio =>
        !esDrop(sitio) &&
        estaSembrado(sitio)
    );

  const cultivos = {};

  sembrados.forEach(sitio => {

    const cultivo =
      limpiarTexto(sitio.Crop);

    const fechaPlanting =
      convertirFechaPlanting(
        sitio[
          "Planting Date (MM/DD/YYYY)"
        ]
      );

    if (
      !cultivo ||
      !fechaPlanting
    ) {
      return;
    }

    const semana =
      crearClaveSemana(
        fechaPlanting
      );

    if (!cultivos[cultivo]) {
      cultivos[cultivo] = {};
    }

    if (!cultivos[cultivo][semana]) {

      cultivos[cultivo][semana] = {
        cantidad: 0,
        aoiIds: [],
        localidades: []
      };

    }

    cultivos[cultivo][semana]
      .cantidad += 1;

    cultivos[cultivo][semana]
      .aoiIds.push(
        limpiarTexto(
          sitio["AOI ID"]
        )
      );

    const localidad =
      limpiarTexto(
        sitio.Location
      );

    if (
      localidad &&
      !cultivos[cultivo][semana]
        .localidades.includes(localidad)
    ) {

      cultivos[cultivo][semana]
        .localidades.push(localidad);

    }

  });

  return cultivos;
}

function cargarRegionesTimeline() {

  const selector =
    document.getElementById(
      "selectorRegionesTimeline"
    );

  const lista =
    document.getElementById(
      "listaRegionesTimeline"
    );

  const regiones = [
    ...new Set(
      sitios
        .map(s => s.Region)
        .filter(Boolean)
    )
  ].sort();

  selector.innerHTML = "";
  lista.innerHTML = "";
  
  regiones.forEach(region => {

    /*
     * option oculta
     */
    const opcion =
      document.createElement("option");

    opcion.value = region;
    opcion.textContent = region;

    selector.appendChild(opcion);

    /*
     * checkbox visible
     */
    const fila =
      document.createElement("div");

    fila.className =
      "region-item";

    const checkbox =
      document.createElement("input");

    checkbox.type =
      "checkbox";

    checkbox.dataset.region =
      region;

    const label =
      document.createElement("label");

    label.textContent =
      region;

checkbox.addEventListener(
  "change",
  () => {

    opcion.selected =
      checkbox.checked;

    selector.dispatchEvent(
      new Event("change")
    );

  }
);

    fila.appendChild(
      checkbox
    );

    fila.appendChild(
      label
    );

    lista.appendChild(
      fila
    );

  });

}

function convertirFechaPlanting(fechaTexto) {

  const partes =
    limpiarTexto(fechaTexto)
      .split("/");

  if (partes.length !== 3) {
    return null;
  }

  const mes =
    Number(partes[0]);

  const dia =
    Number(partes[1]);

  const anio =
    Number(partes[2]);

  const fecha =
    new Date(
      anio,
      mes - 1,
      dia
    );

  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function obtenerInicioSemana(fecha) {

  const inicio =
    new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

  const diaSemana =
    inicio.getDay();

  const diferencia =
    diaSemana === 0
      ? -6
      : 1 - diaSemana;

  inicio.setDate(
    inicio.getDate() + diferencia
  );

  return inicio;
}

function crearClaveSemana(fecha) {

  const inicioSemana =
    obtenerInicioSemana(fecha);

  const anio =
    inicioSemana.getFullYear();

  const mes =
    String(
      inicioSemana.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      inicioSemana.getDate()
    ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearSemanaTimeline(claveSemana) {

  const partes =
    claveSemana
      .split("-")
      .map(Number);

  const fecha =
    new Date(
      partes[0],
      partes[1] - 1,
      partes[2]
    );

  return fecha.toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit"
    }
  );
}

function generarCalendarioSemanal(sitiosBase) {

  const fechasValidas =
    sitiosBase
      .filter(
        sitio =>
          !esDrop(sitio) &&
          estaSembrado(sitio)
      )
      .map(
        sitio =>
          convertirFechaPlanting(
            sitio[
              "Planting Date (MM/DD/YYYY)"
            ]
          )
      )
      .filter(Boolean)
      .sort(
        (a, b) => a - b
      );

  if (fechasValidas.length === 0) {
    return [];
  }

  const primeraSemana =
    obtenerInicioSemana(
      fechasValidas[0]
    );

  const ultimaSemana =
    obtenerInicioSemana(
      fechasValidas[
        fechasValidas.length - 1
      ]
    );

  const semanas = [];

  const cursor =
    new Date(primeraSemana);

  while (cursor <= ultimaSemana) {

    semanas.push(
      crearClaveSemana(cursor)
    );

    cursor.setDate(
      cursor.getDate() + 7
    );
  }

  return semanas;
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
const latTexto =
  limpiarTexto(
    sitio["Latitude Trial"]
  );

const lonTexto =
  limpiarTexto(
    sitio["Longitude Trial"]
  );

if (
  !latTexto ||
  !lonTexto
) {
  return;
}

const lat =
  Number(latTexto);

const lon =
  Number(lonTexto);

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
cargarRegionesTimeline();
    actualizarVista();
console.log(
"Pendientes guardados:",
obtenerSiembrasPendientes()
);
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
const btnTimeline =
  document.getElementById("btnTimeline");

const modalTimeline =
  document.getElementById("modalTimeline");

const cerrarTimeline =
  document.getElementById("cerrarTimeline");
const selectorRegionesTimeline =
  document.getElementById(
    "selectorRegionesTimeline"
  );

selectorRegionesTimeline.addEventListener(
  "change",
  () => {

    console.log(
      "REGIONES CAMBIARON"
    );

    console.log(
      Array.from(
        selectorRegionesTimeline.selectedOptions
      ).map(
        o => o.value
      )
    );

    if (chartTimeline) {
      btnTimeline.click();
    }

  }
);


let chartTimeline = null;

btnTimeline.addEventListener("click", () => {

  modalTimeline.classList.add("visible");

  const datosTimeline =
  generarDatosTimeline();

  console.log("TIMELINE");
console.log(datosTimeline);
  
console.table(datosTimeline);

  const ctx =
    document.getElementById("graficoTimeline");

  if (chartTimeline) {
    chartTimeline.destroy();
  }

const selectorRegiones =
  document.getElementById(
    "selectorRegionesTimeline"
  );

const regionesSeleccionadas =
  Array.from(
    selectorRegiones.selectedOptions
  )
  .map(
    opcion => opcion.value
  )
  .filter(
    valor => valor !== ""
  );

console.log(
  "REGIONES:",
  regionesSeleccionadas
);

const sitiosFiltradosRegion =
  regionesSeleccionadas.length === 0
    ? sitios
    : sitios.filter(
        sitio =>
          regionesSeleccionadas.includes(
            sitio.Region
          )
      );
  console.log(
  "AOI FILTRADOS REGION:",
  sitiosFiltradosRegion.length
);
console.log(
  "AOI REGION:",
  sitiosFiltradosRegion.length
);
const cultivos =
  generarDatosTimeline(
    sitiosFiltradosRegion
  );

const datasets = [];

const colores = [
  "#f28c28",
  "#3b82f6",
  "#22c55e",
  "#e11d48",
  "#a855f7",
  "#f59e0b"
];

/*
 * Calendario continuo por semanas.
 * Usa únicamente las regiones seleccionadas.
 */
const calendarioSemanal =
  generarCalendarioSemanal(
    sitiosFiltradosRegion
  );

const labelsGlobales =
  calendarioSemanal.map(
    semana =>
      formatearSemanaTimeline(
        semana
      )
  );

let indiceColor = 0;

/*
 * Una línea por cultivo.
 */
Object.entries(cultivos).forEach(
  ([cultivo, semanasCultivo]) => {

    const totalCultivo =
      sitiosFiltradosRegion.filter(
        sitio =>
          !esDrop(sitio) &&
          limpiarTexto(
            sitio.Crop
          ) === cultivo
      ).length;

    if (totalCultivo === 0) {
      return;
    }

    let acumulado = 0;

    const puntos =
      calendarioSemanal.map(
        semana => {

          const actividad =
            semanasCultivo[semana];

          const cantidadSemana =
            actividad
              ? actividad.cantidad
              : 0;

          acumulado += cantidadSemana;

          return {
            x:
              formatearSemanaTimeline(
                semana
              ),

            y:
              (
                acumulado /
                totalCultivo
              ) * 100,

            aoiDia:
              cantidadSemana,

            aoiIds:
              actividad
                ? actividad.aoiIds
                : [],

            localidades:
              actividad
                ? actividad.localidades
                : [],

            semana:
              semana
          };

        }
      );

    datasets.push({

      label:
        cultivo,

      data:
        puntos,

      ultimoAvance:
        puntos.length
          ? puntos[
              puntos.length - 1
            ].y
          : 0,

      /*
       * No muestra círculo en semanas
       * sin actividad.
       */
      pointRadius:
        contexto => {

          const punto =
            contexto.raw;

          if (
            !punto ||
            punto.aoiDia === 0
          ) {
            return 0;
          }

          return Math.max(
            5,
            punto.aoiDia * 3
          );

        },

      pointHoverRadius:
        contexto => {

          const punto =
            contexto.raw;

          if (
            !punto ||
            punto.aoiDia === 0
          ) {
            return 0;
          }

          return Math.max(
            7,
            punto.aoiDia * 3 + 2
          );

        },

      borderColor:
        colores[
          indiceColor %
          colores.length
        ],

      backgroundColor:
        colores[
          indiceColor %
          colores.length
        ],

      borderWidth:
        2,

      tension:
        0,

      fill:
        false

    });

    indiceColor++;

  }
);

/*
 * Ordenar la leyenda por avance final.
 */
datasets.sort(
  (a, b) =>
    b.ultimoAvance -
    a.ultimoAvance
);

/*
 * Línea gris de avance total.
 */
const sitiosOperativos =
  sitiosFiltradosRegion.filter(
    sitio =>
      !esDrop(sitio)
  );

const totalAOI =
  sitiosOperativos.length;

let acumuladoGeneral = 0;

const puntosGenerales =
  calendarioSemanal.map(
    semana => {

      const aoiDeLaSemana =
        sitiosOperativos.filter(
          sitio => {

            if (
              !estaSembrado(sitio)
            ) {
              return false;
            }

            const fecha =
              convertirFechaPlanting(
                sitio[
                  "Planting Date (MM/DD/YYYY)"
                ]
              );

            return (
              fecha &&
              crearClaveSemana(fecha) ===
                semana
            );

          }
        );

      acumuladoGeneral +=
        aoiDeLaSemana.length;

      return {
        x:
          formatearSemanaTimeline(
            semana
          ),

        y:
          totalAOI > 0
            ? (
                acumuladoGeneral /
                totalAOI
              ) * 100
            : 0,

        aoiDia:
          aoiDeLaSemana.length,

        aoiIds:
          aoiDeLaSemana.map(
            sitio =>
              limpiarTexto(
                sitio["AOI ID"]
              )
          ),

        localidades:
          [
            ...new Set(
              aoiDeLaSemana
                .map(
                  sitio =>
                    limpiarTexto(
                      sitio.Location
                    )
                )
                .filter(Boolean)
            )
          ],

        semana:
          semana
      };

    }
  );

datasets.unshift({

  label:
    "Avance Total",

  data:
    puntosGenerales,

  borderColor:
    "#a9a9a9",

  backgroundColor:
    "#a9a9a9",

  borderWidth:
    3,

  pointRadius:
    contexto => {

      const punto =
        contexto.raw;

      if (
        !punto ||
        punto.aoiDia === 0
      ) {
        return 0;
      }

      return Math.max(
        5,
        punto.aoiDia * 2
      );

    },

  pointHoverRadius:
    contexto => {

      const punto =
        contexto.raw;

      if (
        !punto ||
        punto.aoiDia === 0
      ) {
        return 0;
      }

      return Math.max(
        7,
        punto.aoiDia * 2 + 2
      );

    },

  tension:
    0,

  fill:
    false

});
  
  chartTimeline = new Chart(ctx, {

    type: "line",

    data: {

labels: labelsGlobales,
datasets: datasets
   
    },

    options: {

      responsive: true,

      maintainAspectRatio: false,

plugins: {

  legend: {
    display: true
  },

  tooltip: {

    callbacks: {

      label: function(context) {

        const punto =
          context.raw;

        return [

          `Avance: ${punto.y.toFixed(1)}%`,

          `AOI sembrados: ${punto.aoiDia}`,

          `AOI: ${punto.aoiIds.join(", ")}`,

          `Localidades: ${punto.localidades.join(", ")}`

        ];

      }

    }

  }

}, 

scales: {

        y: {
          beginAtZero: true,
          max: 100,

          title: {
            display: true,
            text: "% Avance"
          }
        },

        x: {
          type: "category",
          title: {
            display: true,
            text: "Planting Date"
          }
          
        }
      }
    }
  });

});

cerrarTimeline.addEventListener("click", () => {
  modalTimeline.classList.remove("visible");
});
