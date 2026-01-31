'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";

export default function ActionOfficerSweepingPage() {
    const [list, setList] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [remarks, setRemarks] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        const res = await SweepingApi.actionRequired();
        setList(res.inspections);
    };

    const submit = async () => {
        if (!remarks) return alert("Remarks required");

        await SweepingApi.submitAction(selected.id, {
            remarks,
            photos
        });

        alert("Submitted");

        setSelected(null);
        setRemarks("");
        setPhotos([]);
        load();
    };

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["ACTION_OFFICER"]}>
                <div style={{ padding: 24 }}>
                    <h2>Action Officer – Sweeping</h2>

                    {!selected && (
                        <>
                            {list.map(i => (
                                < div style={{ marginBottom: 12 }}>
                                    <Card key={i.id}>
                                        <b>{i.employee?.name}</b>
                                        <div>Beat: {i.sweepingBeat?.geoNodeBeat?.name}</div>

                                        <Button style={{ marginTop: 8 }} onClick={() => setSelected(i)}>
                                            Take Action
                                        </Button>
                                    </Card>
                                </div>
                            ))}

                            {list.length === 0 && <div>No pending actions.</div>}
                        </>
                    )}

                    {selected && (
                        <Card>
                            <Button onClick={() => setSelected(null)}>← Back</Button>

                            <h3>Inspection</h3>

                            {selected.answers?.map((a: any, idx: number) => (
                                <div key={idx}>
                                    {a.questionCode}: {a.answer ? "YES" : "NO"}
                                </div>
                            ))}

                            <textarea
                                placeholder="Action remarks"
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                style={{ width: "100%", marginTop: 12 }}
                            />

                            <input
                                placeholder="Photo URL (optional)"
                                onBlur={e => setPhotos([e.target.value])}
                                style={{ width: "100%", marginTop: 8 }}
                            />

                            <Button onClick={submit} style={{ marginTop: 12 }}>
                                Submit Action
                            </Button>
                        </Card>
                    )}
                </div>
            </ModuleGuard>
        </Protected>
    );
}
