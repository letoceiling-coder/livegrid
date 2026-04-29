import { useEffect, useState } from 'react';

declare global {
  interface Window { ymaps: any; }
}

const YANDEX_MAPS_SRC = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd';

export function useYandexMapsReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.ymaps) {
      window.ymaps.ready(() => setReady(true));
      return;
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-yandex-maps="true"]');
    if (!script) {
      script = document.createElement('script');
      script.src = YANDEX_MAPS_SRC;
      script.async = true;
      script.dataset.yandexMaps = 'true';
      document.head.appendChild(script);
    }

    script.addEventListener('load', () => window.ymaps?.ready(() => setReady(true)), { once: true });
  }, []);

  return { ready };
}
