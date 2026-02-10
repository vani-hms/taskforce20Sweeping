'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type KMLFeature = {
    name: string;
    properties: Record<string, any>;
    geometry: {
        type: string;
        coordinates: number[] | number[][] | number[][][];
    };
};

interface MapViewerProps {
    features: KMLFeature[];
}

export default function MapViewer({ features }: MapViewerProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapContainerRef.current || features.length === 0) return;

        // Initialize map only once
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([26.9, 75.8], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(mapRef.current);
        }

        // Early return if map is not initialized
        if (!mapRef.current) return;

        const map = mapRef.current;

        // Clear existing layers
        map.eachLayer((layer) => {
            if (layer instanceof L.Polygon || layer instanceof L.Polyline || layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        const bounds: L.LatLngBounds = L.latLngBounds([]);
        const colors = [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1'
        ];

        // Add features to map
        features.forEach((feature, idx) => {
            const color = colors[idx % colors.length];

            if (feature.geometry.type === 'Polygon') {
                const coords = feature.geometry.coordinates[0] as number[][];
                const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));

                const polygon = L.polygon(latLngs, {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.2,
                    weight: 3
                }).addTo(map);

                polygon.bindPopup(`
          <div style="font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${feature.name}</h3>
            <div style="font-size: 12px; color: #64748b;">
              <strong>Type:</strong> ${feature.geometry.type}<br>
              <strong>Points:</strong> ${coords.length}
            </div>
          </div>
        `);

                bounds.extend(polygon.getBounds());
            } else if (feature.geometry.type === 'LineString') {
                const coords = feature.geometry.coordinates as number[][];
                const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));

                const polyline = L.polyline(latLngs, {
                    color: color,
                    weight: 4,
                    opacity: 0.8
                }).addTo(map);

                polyline.bindPopup(`
          <div style="font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${feature.name}</h3>
            <div style="font-size: 12px; color: #64748b;">
              <strong>Type:</strong> ${feature.geometry.type}<br>
              <strong>Points:</strong> ${coords.length}
            </div>
          </div>
        `);

                bounds.extend(polyline.getBounds());
            } else if (feature.geometry.type === 'Point') {
                const coord = feature.geometry.coordinates as number[];
                const latLng = L.latLng(coord[1], coord[0]);

                const marker = L.marker(latLng, {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="background: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(map);

                marker.bindPopup(`
          <div style="font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${feature.name}</h3>
            <div style="font-size: 12px; color: #64748b;">
              <strong>Type:</strong> ${feature.geometry.type}<br>
              <strong>Location:</strong> ${coord[1].toFixed(6)}, ${coord[0].toFixed(6)}
            </div>
          </div>
        `);

                bounds.extend(latLng);
            }
        });

        // Fit map to bounds
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [features]);

    return <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />;
}
