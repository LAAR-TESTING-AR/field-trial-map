(function () {
  "use strict";

  const CSV_URL = "AccessPhotos.csv";
  let registros = [];
  let cargaPromise = null;

  function texto(valor) {
    return String(valor ?? "").trim();
  }

  function numero(valor, predeterminado = 0) {
    const convertido = Number(texto(valor));
    return Number.isFinite(convertido) ? convertido : predeterminado;
  }

  function transformarFila(fila) {
    return {
      title: texto(fila["Title"]),
      aoiId: texto(fila["AccessID"]),
      location: texto(fila["Location"]),
      comments: texto(fila["Comments"]),
      photoLink: texto(fila["PhotoLink"]),
      captureDate: texto(fila["CaptureDate"]),
      publicPhotoUrl: texto(fila["PublicPhotoUrl"]),
      photoType: texto(fila["PhotoType"]),
      crop: texto(fila["Crop"]),
      cropStage: texto(fila["CropStage"]),
      visitId: texto(fila["VisitId"]),
      photoOrder: numero(fila["PhotoOrder"], 1)
    };
  }

  function cargarHistorial(forzar = false) {
    if (cargaPromise && !forzar) {
      return cargaPromise;
    }

    cargaPromise = new Promise((resolve, reject) => {
      Papa.parse(CSV_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        transformHeader: encabezado =>
          encabezado.replace(/^\uFEFF/, "").trim(),
        complete: resultado => {
          registros = resultado.data
            .map(transformarFila)
            .filter(registro =>
              registro.aoiId &&
              registro.publicPhotoUrl
            );

          if (resultado.errors.length) {
            console.warn(
              "Advertencias al cargar AccessPhotos.csv:",
              resultado.errors
            );
          }

          console.log(
            `${registros.length} fotografías históricas cargadas.`
          );

          resolve(registros);
        },
        error: error => {
          cargaPromise = null;
          console.error(
            "No fue posible cargar el historial de fotografías:",
            error
          );
          reject(error);
        }
      });
    });

    return cargaPromise;
  }

  function normalizar(valor) {
    return texto(valor).toLowerCase();
  }

  async function obtenerFotos(aoiId, photoType) {
    await cargarHistorial();

    return registros
      .filter(registro =>
        normalizar(registro.aoiId) === normalizar(aoiId) &&
        normalizar(registro.photoType) === normalizar(photoType)
      )
      .sort((a, b) => {
        const diferenciaFecha =
          new Date(b.captureDate).getTime() -
          new Date(a.captureDate).getTime();

        if (diferenciaFecha !== 0) {
          return diferenciaFecha;
        }

        return a.photoOrder - b.photoOrder;
      });
  }

  async function obtenerVisitas(aoiId, photoType) {
    const fotos = await obtenerFotos(aoiId, photoType);
    const grupos = new Map();

    fotos.forEach(foto => {
      const clave = foto.visitId || foto.title;

      if (!grupos.has(clave)) {
        grupos.set(clave, {
          visitId: clave,
          aoiId: foto.aoiId,
          location: foto.location,
          photoType: foto.photoType,
          crop: foto.crop,
          cropStage: foto.cropStage,
          comments: foto.comments,
          captureDate: foto.captureDate,
          photos: []
        });
      }

      grupos.get(clave).photos.push(foto);
    });

    return [...grupos.values()]
      .map(visita => {
        visita.photos.sort(
          (a, b) => a.photoOrder - b.photoOrder
        );
        return visita;
      })
      .sort(
        (a, b) =>
          new Date(b.captureDate).getTime() -
          new Date(a.captureDate).getTime()
      );
  }

  window.FieldPhotoHistory = {
    cargarHistorial,
    obtenerFotos,
    obtenerVisitas
  };

  cargarHistorial().catch(() => {
    /* El historial podrá reintentarse al abrirlo. */
  });
})();
