'use client';

import { useEffect, useState } from "react";
import { GeoApi } from "@lib/apiClient";
import { SweepingApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";

export default function SweepingAdminPage() {
    const [wards, setWards] = useState<any[]>([]);
    const [wardId, setWardId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        GeoApi.list("WARD").then(res => setWards(res.nodes || []));
    }, []);

    const upload = async () => {
        if (!wardId || !file) {
            alert("Select ward and KML file");
            return;
        }

        setLoading(true);
        setMsg("");

        try {
            const fd = new FormData();
            fd.append("file", file);

            await SweepingApi.uploadKml(wardId, fd);

            setMsg("✅ KML uploaded successfully. Beats created.");
            setFile(null);
        } catch (e: any) {
            setMsg(e.message || "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["CITY_ADMIN"]} requireWrite>
                <div style={{ padding: 32, maxWidth: 600 }}>
                    <h2>Sweeping — Upload Beat KML</h2>
                    <div style={{ marginTop: 20 }}>


                        <Card >
                            <label>Ward</label>
                            <select
                                value={wardId}
                                onChange={e => setWardId(e.target.value)}
                                className="input"
                            >
                                <option value="">Select Ward</option>
                                {wards.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>

                            <div style={{ marginTop: 16 }}>
                                <input
                                    type="file"
                                    accept=".kml"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                />
                            </div>

                            <Button
                                style={{ marginTop: 20 }}
                                onClick={upload}
                                disabled={loading}
                            >
                                {loading ? "Uploading..." : "Upload KML"}
                            </Button>

                            {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
                        </Card>
                    </div>
                </div>
            </ModuleGuard>
        </Protected>
    );
}
