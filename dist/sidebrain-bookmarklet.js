(function () {
  const APP_ORIGIN = (() => {
    try {
      return new URL(
        document.currentScript && document.currentScript.src
          ? document.currentScript.src
          : window.location.origin,
      ).origin;
    } catch (_error) {
      return window.location.origin;
    }
  })();

  const message =
    "Sidepanel mode has been removed. Use the Braino extension and open it with Command+I instead.";

  try {
    window.alert(message);
  } catch (_error) {
    // Ignore alert failures in restrictive contexts.
  }

  window.open(`${APP_ORIGIN}/home#install`, "_blank", "noopener,noreferrer");
})();
