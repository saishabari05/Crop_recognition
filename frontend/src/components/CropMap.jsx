import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { severityColor } from '../utils/formatters';

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

function CropMap({ points }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const validPoints = useMemo(
    () =>
      (points ?? []).filter(
        (point) =>
          Array.isArray(point.coordinates) &&
          point.coordinates.length === 2 &&
          point.coordinates.every((value) => typeof value === 'number'),
      ),
    [points],
  );

  if (!mounted) {
    return <div className="h-[360px] rounded-[1.5rem] bg-earth-50" />;
  }

  return (
    <div className="h-[360px] overflow-hidden rounded-[1.5rem] border border-[#d9d4c8] bg-white p-3 shadow-sm">
      <MapContainer
        key={`heatmap-${validPoints.length}`}
        center={[20.5937, 78.9629]}
        zoom={4}
        scrollWheelZoom={false}
        className="h-full w-full rounded-[1.2rem]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPoints.map((point) => (
          <Marker key={point.id} position={point.coordinates} icon={iconForSeverity(point.severity)}>
            <Popup>
              <div className="space-y-2">
                <p className="font-semibold">{point.crop}</p>
                <p className="text-sm">{point.locationName}</p>
                <p className="text-sm">{point.disease}</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${severityColor(point.severity)}`}>
                  {point.severity}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default CropMap;

