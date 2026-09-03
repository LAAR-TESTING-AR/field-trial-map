const CLAVE_SIEMBRAS_PENDIENTES =
  "plantingPendingSync";

function obtenerSiembrasPendientes() {

  try {

    return JSON.parse(
      localStorage.getItem(
        CLAVE_SIEMBRAS_PENDIENTES
      ) || "[]"
    );

  } catch {

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

}

function agregarSiembraPendiente(
  aoiId,
  fecha
) {

  const pendientes =
    obtenerSiembrasPendientes();

  pendientes.push({
    aoiId,
    plantingDate: fecha,
    registeredAt:
      new Date().toISOString()
  });

  guardarSiembrasPendientes(
    pendientes
  );

}

async function sincronizarSiembrasPendientes() {

  const pendientes =
    obtenerSiembrasPendientes();

  if (
    !navigator.onLine ||
    pendientes.length === 0
  ) {
    return;
  }

  const pendientesRestantes = [];

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

      }

    } catch {

      pendientesRestantes.push(
        siembra
      );

    }

  }

  guardarSiembrasPendientes(
    pendientesRestantes
  );

}
