'use client';

import { useEffect, useState } from "react";
import { ApiError, CityApi, getModuleId } from "@lib/apiClient";

type City = { id: string; name: string; modules: { moduleId: string; enabled: boolean; name: string }[] };

const AVAILABLE_MODULES = ["TASKFORCE", "TOILET", "MODULE3", "MODULE4", "MODULE5", "MODULE6", "MODULE7", "MODULE8"] as const;

export default function CityModulesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    CityApi.list()
      .then((data: any) => setCities(data.cities || []))
      .catch(() => {
        setError("Failed to load cities");
        setCities([]);
      });
  }, []);

  const toggle = async (cityId: string, moduleId: string, enabled: boolean) => {
    await CityApi.toggleModule(cityId, moduleId, enabled);
    setCities((prev) =>
      prev.map((c) =>
        c.id === cityId
          ? {
              ...c,
              modules: c.modules.map((m) => (m.moduleId === moduleId ? { ...m, enabled } : m))
            }
          : c
      )
    );
  };

  return (
    <div className="card">
      <h2>Enable / Disable Modules</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {cities.map((city) => (
        <div key={city.id} className="card">
          <h3>{city.name}</h3>
          {AVAILABLE_MODULES.map((m) => {
            const existing = city.modules.find((cm) => cm.name.toUpperCase() === m);
            const enabled = existing?.enabled ?? false;
            return (
              <div key={m} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>{m}</span>
                <label>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={async (e) => {
                      try {
                        const resolvedId = existing?.moduleId || (await getModuleId(m));
                        if (!resolvedId) throw new ApiError(400, "Module not found");
                        await toggle(city.id, resolvedId, e.target.checked);
                      } catch (err) {
                        setError("Failed to toggle module");
                      }
                    }}
                  />{" "}
                  Enabled
                </label>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
