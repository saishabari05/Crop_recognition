import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';

function colorForSeverity(severity) {
  if (String(severity).toLowerCase() === 'high') return '#be123c';
  if (String(severity).toLowerCase() === 'moderate') return '#b45309';
  return '#15803d';
}

function iconForSeverity(severity) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${colorForSeverity(
      severity,
    )};border:3px solid white;box-shadow:0 10px 24px rgba(15,23,42,.22)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function popupMarkup(point) {
  return `
    <div style="min-width:160px">
      <p style="margin:0 0 6px;font-weight:700;color:#21352a;">${point.crop ?? 'Unknown crop'}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#4d6155;">${point.locationName ?? 'Unknown location'}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#4d6155;">${point.disease ?? 'Unknown disease'}</p>
      <span style="display:inline-flex;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:700;background:${colorForSeverity(
        point.severity,
      )}18;color:${colorForSeverity(point.severity)};">
        ${point.severity ?? 'Unknown'}
      </span>
    </div>
  `;
}

function CropMap({ points, activePointId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const markersRef = useRef(new Map());

  const validPoints = useMemo(
    () =>
      (points ?? []).filter(
        (point) =>
          Array.isArray(point.coordinates) &&
          point.coordinates.length === 2 &&
          point.coordinates.every((value) => typeof value === 'number' && Number.isFinite(value)),
      ),
    [points],
  );

  useEffect(() => {
    const container = mapRef.current;
    if (!container || mapInstanceRef.current) return undefined;

    const map = L.map(container, {
      center: [20.5937, 78.9629],
      zoom: 4,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      markersRef.current.clear();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markersRef.current.clear();

    validPoints.forEach((point) => {
      const marker = L.marker(point.coordinates, { icon: iconForSeverity(point.severity) });
      marker.bindPopup(popupMarkup(point));
      markerLayer.addLayer(marker);
      markersRef.current.set(String(point.id), marker);
    });

    if (validPoints.length === 1) {
      map.setView(validPoints[0].coordinates, 9);
      return;
    }

    if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints.map((point) => point.coordinates));
      map.fitBounds(bounds, { padding: [36, 36] });
      return;
    }

    map.setView([20.5937, 78.9629], 4);
  }, [validPoints]);

  useEffect(() => {
    if (!activePointId) return;

    const map = mapInstanceRef.current;
    const marker = markersRef.current.get(String(activePointId));
    if (!map || !marker) return;

    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 9), { duration: 0.75 });
    marker.openPopup();
  }, [activePointId]);

  return (
    <div className="h-[360px] overflow-hidden rounded-[1.5rem] border border-[#d9d4c8] bg-white p-3 shadow-sm">
      <div ref={mapRef} className="h-full w-full rounded-[1.2rem]" />
    </div>
  );
}

export default CropMap;
