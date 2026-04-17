import Toast from 'bootstrap/js/src/toast';

if ('serviceWorker' in navigator) {
  // Get Jekyll config from URL parameters
  const src = new URL(document.currentScript.src);
  const register = src.searchParams.get('register');
  const baseUrl = src.searchParams.get('baseurl');

  if (register) {
    const swUrl = `${baseUrl}/sw.min.js`;
    const notification = document.getElementById('notification');
    const btnRefresh = notification.querySelector('.toast-body>button');
    const popupWindow = Toast.getOrCreateInstance(notification);

    const DISMISSED_SW_KEY = 'dismissedSW';

    function showUpdatePopup(registration) {
      const dismissedUrl = localStorage.getItem(DISMISSED_SW_KEY);
      if (registration.waiting && registration.waiting.scriptURL !== dismissedUrl) {
        popupWindow.show();
      }
    }

    navigator.serviceWorker.register(swUrl).then((registration) => {
      showUpdatePopup(registration);

      registration.addEventListener('updatefound', () => {
        registration.installing.addEventListener('statechange', () => {
          if (registration.waiting) {
            if (navigator.serviceWorker.controller) {
              popupWindow.show();
            }
          }
        });
      });

      btnRefresh.addEventListener('click', () => {
        if (registration.waiting) {
          registration.waiting.postMessage('SKIP_WAITING');
        }
        popupWindow.hide();
      });

      notification.addEventListener('hidden.bs.toast', () => {
        if (registration.waiting) {
          localStorage.setItem(DISMISSED_SW_KEY, registration.waiting.scriptURL);
        }
      });
    });

    let refreshing = false;

    // Detect controller change and refresh all the opened tabs
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
  } else {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
}
