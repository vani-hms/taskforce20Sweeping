"use client";

import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function QcHeatmap({ inspections }: { inspections: any[] }) {
  return (
    <div className="card mt-4">
      <h3>QC Heatmap</h3>

      <MapContainer
        {...({
          center: [22.7, 75.9],
          zoom: 13,
          style: { height: 300, width: "100%" }
        } as any)}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {inspections.map(i => (
          <Circle
            key={i.id}
            {...({
              center: [i.latitude, i.longitude],
              radius: 20,
              pathOptions: {
                color:
                  i.status === "APPROVED"
                    ? "green"
                    : i.status === "ACTION_REQUIRED"
                    ? "orange"
                    : "red"
              }
            } as any)}
          />
        ))}
      </MapContainer>
    </div>
  );
}
