let deferredPrompt = null;

const installBtn =
  document.getElementById(
    "installAppBtn"
  );

window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredPrompt = event;

    if (installBtn) {
      installBtn.style.display =
        "inline-block";
    }

  }
);

if (installBtn) {

  installBtn.addEventListener(
    "click",
    async () => {

      const esIOS =
        /iphone|ipad|ipod/i.test(
          navigator.userAgent
        );

      if (esIOS) {

        alert(
          "En iPhone:\n\n1. Presioná Compartir\n2. Agregar a pantalla de inicio"
        );

        return;

      }

      if (!deferredPrompt) {

        alert(
          "La aplicación ya está instalada o este dispositivo no admite instalación PWA."
        );

        return;

      }

      deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      deferredPrompt = null;

    }
  );

}
