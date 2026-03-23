import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

declare global {
  interface Window { ymaps: any; }
}

export default function MapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const [ready, setReady] = useState(!!window.ymaps);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  // Load Yandex Maps script
  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(() => setReady(true)); return; }
    if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
      const check = setInterval(() => {
        if (window.ymaps) { window.ymaps.ready(() => setReady(true)); clearInterval(check); }
      }, 200);
      return () => clearInterval(check);
    }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    s.async = true;
    s.onload = () => window.ymaps.ready(() => setReady(true));
    document.head.appendChild(s);
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const center = lat && lng ? [lat, lng] : [55.7558, 37.6173]; // Moscow default
    const zoom   = lat && lng ? 14 : 10;

    const map = new window.ymaps.Map(containerRef.current, {
      center,
      zoom,
      controls: ['zoomControl'],
    });
    mapRef.current = map;

    // Initial placemark
    if (lat && lng) {
      const pm = new window.ymaps.Placemark([lat, lng], {}, { preset: 'islands#redDotIcon' });
      map.geoObjects.add(pm);
      placemarkRef.current = pm;
    }

    // Click to place/move marker
    map.events.add('click', (e: any) => {
      const coords = e.get('coords');
      const [newLat, newLng] = coords;

      if (placemarkRef.current) {
        map.geoObjects.remove(placemarkRef.current);
      }
      const pm = new window.ymaps.Placemark([newLat, newLng], {}, { preset: 'islands#redDotIcon' });
      map.geoObjects.add(pm);
      placemarkRef.current = pm;

      onChange(parseFloat(newLat.toFixed(7)), parseFloat(newLng.toFixed(7)));
    });

    return () => {
      try { map.destroy(); } catch {}
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (!search.trim() || !mapRef.current) return;
    setSearching(true);
    try {
      const result = await window.ymaps.geocode(search, { results: 1 });
      const obj = result.geoObjects.get(0);
      if (obj) {
        const coords = obj.geometry.getCoordinates();
        mapRef.current.setCenter(coords, 15);

        if (placemarkRef.current) {
          mapRef.current.geoObjects.remove(placemarkRef.current);
        }
        const pm = new window.ymaps.Placemark(coords, {}, { preset: 'islands#redDotIcon' });
        mapRef.current.geoObjects.add(pm);
        placemarkRef.current = pm;

        onChange(
          parseFloat(coords[0].toFixed(7)),
          parseFloat(coords[1].toFixed(7)),
        );
      }
    } catch {}
    setSearching(false);
  };

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск адреса…"
            className="w-full pl-9 pr-3 h-9 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {searching ? 'Поиск…' : 'Найти'}
        </button>
        {lat && lng && (
          <button
            type="button"
            onClick={() => {
              if (placemarkRef.current && mapRef.current) {
                mapRef.current.geoObjects.remove(placemarkRef.current);
                placemarkRef.current = null;
              }
              onChange(0, 0);
            }}
            className="px-3 h-9 rounded-xl border text-muted-foreground hover:text-destructive transition-colors"
            title="Очистить координаты"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Coordinates display */}
      {lat && lng ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>Lat: {lat}, Lng: {lng}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Кликните на карту для установки метки</p>
      )}

      {/* Map */}
      <div
        ref={containerRef}
        className="w-full h-64 rounded-xl overflow-hidden border bg-muted"
      >
        {!ready && (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Загрузка карты…
          </div>
        )}
      </div>
    </div>
  );
}
