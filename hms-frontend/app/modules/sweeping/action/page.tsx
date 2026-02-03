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
  const [photoInput, setPhotoInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const res = await SweepingApi.actionRequired();
    setList(res.inspections || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addPhoto = () => {
    if (!photoInput) return;
    setPhotos([...photos, photoInput]);
    setPhotoInput("");
  };

  const submit = async () => {
    if (!remarks) return alert("Remarks required");

    if (!confirm("Submit action response?")) return;

    try {
      setSubmitting(true);

      await SweepingApi.submitAction(selected.id, {
        remarks,
        photos
      });

      alert("Action submitted");

      setSelected(null);
      setRemarks("");
      setPhotos([]);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Protected>
      <ModuleGuard module="SWEEPING" roles={["ACTION_OFFICER"]}>
        <div style={{ padding: 24 }}>

          <h2>Action Officer – Sweeping</h2>
          <p style={{ color: "#6b7280" }}>
            Resolve action required inspections
          </p>

          {!selected && (
            <>
              {list.map(i => (
                <div key={i.id} style={{ marginBottom: 12 }}>
                  <Card>

                    <b>{i.sweepingBeat?.geoNodeBeat?.name}</b>

                    <div style={{ color: "#6b7280" }}>
                      Employee: {i.employee?.name}
                    </div>

                    <Button style={{ marginTop: 10 }} onClick={() => setSelected(i)}>
                      Take Action
                    </Button>

                  </Card>
                </div>
              ))}

              {list.length === 0 && (
                <div>No pending actions.</div>
              )}
            </>
          )}

          {selected && (
            <Card>

              <Button onClick={() => setSelected(null)}>← Back</Button>

              <h3 style={{ marginTop: 10 }}>Inspection Details</h3>

              {selected.answers?.map((a: any, idx: number) => (
                <div key={idx}>
                  {a.questionCode}: {a.answer ? "YES" : "NO"}
                </div>
              ))}

              <textarea
                placeholder="Describe action taken..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                style={{ width: "100%", marginTop: 12, minHeight: 80 }}
              />

              <div style={{ marginTop: 8 }}>
                <input
                  placeholder="Photo URL"
                  value={photoInput}
                  onChange={e => setPhotoInput(e.target.value)}
                  style={{ width: "80%" }}
                />
                <Button onClick={addPhoto} style={{ marginLeft: 6 }}>
                  Add
                </Button>
              </div>

              {photos.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "#6b7280" }}>
                  {p}
                </div>
              ))}

              <Button
                onClick={submit}
                style={{ marginTop: 12 }}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Action"}
              </Button>

            </Card>
          )}

        </div>
      </ModuleGuard>
    </Protected>
  );
}
