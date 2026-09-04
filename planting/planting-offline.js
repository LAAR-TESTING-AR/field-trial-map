const CLAVE_SIEMBRAS_PENDIENTES =
  "plantingPendingSync";

let sincronizacionSiembraEnCurso = false;

function obtenerSiembrasPendientes() {
  try {
    const contenido =
      localStorage.getItem(
        CLAVE_SIEMBRAS_PENDIENTES
      );

    return contenido
      ? JSON.parse(contenido)
      : [];
  } catch (error) {
    console.error(
      "Error leyendo siembras pendientes:",
      error
    );

    return [];
  }
}

function guardarSiembrasPendientes(
  pendientes
) {
  localStorage.setItem(
    CLAVE_SIEMBRAS_PENDIENTES,
    JSON.stringify(pendientes)
  );

  actualizarIndicadorOffline();
}

function agregarSiembraPendiente(
  aoiId,
  fecha
) {
  const pendientes =
    obtenerSiembrasPendientes();

  /*
   * Si el mismo AOI ya estaba pendiente,
   * reemplazamos el registro para evitar
   * enviar dos fechas distintas.
   */
  const sinDuplicado =
    pendientes.filter(
      registro =>
        registro.aoiId !== aoiId
    );

  sinDuplicado.push({
    aoiId: aoiId,
    plantingDate: fecha,
    registeredAt:
      new Date().toISOString(),
    source:
      "Field Trial Map Planting Offline"
  });

  guardarSiembrasPendientes(
    sinDuplicado
  );

  console.log(
    "Siembra guardada localmente:",
    aoiId,
    fecha
  );
}

function actualizarIndicadorOffline() {
  const indicador =
    document.getElementById(
      "estadoSincronizacion"
    );

  if (!indicador) {
    return;
  }

  const cantidad =
    obtenerSiembrasPendientes().length;

  if (cantidad === 0) {
    indicador.textContent =
      "✅ Sync";

    indicador.style.color =
      "#0b6b3a";

    indicador.title =
      "Todos los registros están sincronizados";

    return;
  }

  indicador.textContent =
    cantidad === 1
      ? "📡 1 pendiente"
      : `📡 ${cantidad} pendientes`;

  indicador.style.color =
    "#c26800";

  indicador.title =
    "Siembras pendientes de sincronización";
}

async function sincronizarSiembrasPendientes() {
  if (sincronizacionSiembraEnCurso) {
    return;
  }

  const pendientes =
    obtenerSiembrasPendientes();

  if (pendientes.length === 0) {
    actualizarIndicadorOffline();
    return;
  }

  sincronizacionSiembraEnCurso = true;

  console.log(
    `Intentando sincronizar ${pendientes.length} siembra(s)`
  );

  const pendientesRestantes = [];

  try {
    for (const siembra of pendientes) {
      try {
        const respuesta =
          await fetch(
            URL_FLOW_SIEMBRA,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                aoiId:
                  siembra.aoiId,
                plantingDate:
                  siembra.plantingDate,
                registeredAt:
                  siembra.registeredAt,
                source:
                  "Field Trial Map Offline Sync"
              })
            }
          );

        if (!respuesta.ok) {
          pendientesRestantes.push(
            siembra
          );

          continue;
        }

        console.log(
          "Siembra sincronizada:",
          siembra.aoiId
        );

      } catch (error) {
        console.log(
          "La siembra continúa pendiente:",
          siembra.aoiId
        );

        pendientesRestantes.push(
          siembra
        );
      }
    }

    guardarSiembrasPendientes(
      pendientesRestantes
    );

  } finally {
    sincronizacionSiembraEnCurso = false;
    actualizarIndicadorOffline();
  }
}
function reconciliarPendientesConSitios(
  sitiosActuales
) {
  const pendientes =
    obtenerSiembrasPendientes();

  if (
    pendientes.length === 0 ||
    !Array.isArray(sitiosActuales)
  ) {
    actualizarIndicadorOffline();
    return;
  }

  const pendientesReales =
    pendientes.filter(pendiente => {

      const sitioBase =
        sitiosActuales.find(
          sitio =>
            String(
              sitio["AOI ID"] || ""
            ).trim() ===
            String(
              pendiente.aoiId || ""
            ).trim()
        );

      if (!sitioBase) {
        return true;
      }

      const fechaEnBase =
        String(
          sitioBase[
            "Planting Date (MM/DD/YYYY)"
          ] || ""
        ).trim();

      /*
       * Si el CSV ya tiene fecha,
       * significa que el registro llegó
       * correctamente al Excel.
       */
      return fechaEnBase === "";*    });

  guardarSiembrasPendient*s(
    pendientesReales
  );

  co*sole.log(
    "Pendientes después *e reconciliar:",
    pendientesRea*es.length
  );

  actualizarIndica*orOffline();
}
document.addEventListener(
  "DOMContentLoaded",
  actualizarIndicadorOffline
);
