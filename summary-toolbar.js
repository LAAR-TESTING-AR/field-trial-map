(function () {
  "use strict";

  function moverBotonLimpiar() {
    const resumen = document.querySelector(".resumen");
    const contador = document.getElementById("contadorSitios");
    const boton = document.getElementById("limpiarFiltros");

    if (!resumen || !contador || !boton) {
      return false;
    }

    if (!resumen.classList.contains("resumen-compacto")) {
      resumen.classList.add("resumen-compacto");
    }

    contador.classList.add("resumen-contador");
    boton.classList.add("resumen-limpiar");
    boton.setAttribute("aria-label", "Limpiar todos los filtros");
    boton.title = "Limpiar todos los filtros";

    if (boton.parentElement !== resumen) {
      resumen.appendChild(boton);
    }

    return true;
  }

  function iniciar() {
    if (moverBotonLimpiar()) return;

    let intentos = 0;
    const temporizador = window.setInterval(() => {
      intentos += 1;

      if (moverBotonLimpiar() || intentos >= 50) {
        window.clearInterval(temporizador);
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
