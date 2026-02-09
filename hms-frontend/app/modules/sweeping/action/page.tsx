"use client";

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
export const SWEEPING_QUESTIONS = [
  { code: "Q1", label: "Is sweeping done on this beat today?", hi: "क्या आज इस बीट पर झाड़ू लगाई गई है?", type: "boolean" },
  { code: "Q2", label: "How many times is sweeping done in a day?", hi: "दिन में कितनी बार झाड़ू लगती है?", type: "choice", options: ["Once", "Twice", "More"] },
  { code: "Q3", label: "Is sweeping done as per prescribed frequency?", hi: "क्या निर्धारित आवृत्ति के अनुसार सफाई होती है?", type: "boolean" },
  { code: "Q4", label: "Is the entire beat properly cleaned?", hi: "क्या पूरा बीट ठीक से साफ है?", type: "boolean" },
  { code: "Q5", label: "Is any litter visible after sweeping?", hi: "झाड़ू के बाद कोई कचरा दिख रहा है?", type: "boolean" },

  { code: "Q6", label: "Is sanitation worker present?", hi: "क्या सफाई कर्मचारी मौजूद है?", type: "boolean" },
  { code: "Q7", label: "Is sanitation worker wearing complete PPE?", hi: "क्या कर्मचारी पूरा PPE पहने है?", type: "boolean" },

  { code: "Q8", label: "Type of road", hi: "सड़क का प्रकार", type: "choice", options: ["Single lane", "Two lane", "Four lane"] },
  { code: "Q9", label: "Is this a major / 4 lane road?", hi: "क्या यह मुख्य / 4 लेन सड़क है?", type: "boolean" },

  { code: "Q10", label: "Is mechanized sweeping required?", hi: "क्या मशीन से सफाई जरूरी है?", type: "boolean" },
  { code: "Q11", label: "Is mechanized sweeping happening?", hi: "क्या मशीन से सफाई हो रही है?", type: "boolean" },

  { code: "Q12", label: "Any Garbage Vulnerable Point observed?", hi: "क्या कोई GVP देखा गया?", type: "boolean" },
  { code: "Q13", label: "If yes, is GVP cleaned regularly?", hi: "अगर हाँ, क्या GVP नियमित साफ होता है?", type: "boolean" },
  { code: "Q14", label: "Any C&D waste found?", hi: "क्या C&D कचरा मिला?", type: "boolean" },

  {
    code: "Q15",
    label: "Resident Name / Mobile / Address",
    hi: "निवासी नाम / मोबाइल / पता",
    type: "text"
  },

  { code: "Q16", label: "Resident says sweeping frequency", hi: "निवासी के अनुसार सफाई", type: "choice", options: ["Daily", "Twice daily", "Alternate", "Irregular"] },

  { code: "Q17", label: "Is beat cleaned as per standards?", hi: "क्या बीट मानकों अनुसार साफ है?", type: "boolean" },
  { code: "Q18", label: "Overall cleanliness", hi: "कुल सफाई स्थिति", type: "choice", options: ["Good", "Satisfactory", "Poor"] },

  { code: "Q19", label: "Remarks", hi: "टिप्पणी", type: "text" }
];

export default function ActionOfficerSweepingPage() {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await SweepingApi.actionRequired();
    setList(res.inspections || []);
  };

  const addPhoto = () => {
    if (!photoInput) return;
    setPhotos(p => [...p, photoInput]);
    setPhotoInput("");
  };

  const submit = async () => {
    if (!remarks) return alert("Remarks required");

    await SweepingApi.submitAction(selected.id, {
      remarks,
      photos
    });

    alert("Action Submitted");

    setSelected(null);
    setRemarks("");
    setPhotos([]);
    load();
  };

  return (
    <Protected>
      <ModuleGuard module="SWEEPING" roles={["ACTION_OFFICER"]}>
        <div className="content page">

          <h1>Action Officer – Sweeping</h1>

          {/* ================= LIST ================= */}

          {!selected && (
            <>
              {list.length === 0 && (
                <Card>
                  <div className="muted">No pending actions.</div>
                </Card>
              )}

              <div className="grid grid-3">
                {list.map(item => (
                  <div key={item.id} className="card-hover">
                    <Card >
                      <div className="space-y-1">
                        <div className="font-semibold">{item.employee?.name}</div>
                        <div className="text-sm">
                          {item.sweepingBeat?.geoNodeBeat?.name}
                        </div>
                        <span className="badge badge-warn">ACTION REQUIRED</span>
                      </div>

                      <Button className="btn-sm mt-2" onClick={() => setSelected(item)}>
                        Take Action
                      </Button>
                    </Card>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ================= DETAIL ================= */}

          {selected && (
            <div className="card-spacious">
              <Card >

                <Button className="btn-secondary btn-sm" onClick={() => setSelected(null)}>
                  ← Back
                </Button>

                <h3 className="mt-2">Inspection Details</h3>

                <div className="space-y-1 mt-2">
                  {selected.answers?.map((a: any, idx: number) => (
                    <div key={idx} className="mb-1">
                      <b>
                        {SWEEPING_QUESTIONS.find(q => q.code === a.questionCode)?.label || a.questionCode}
                      </b>
                      : {String(a.answer || "").toUpperCase()}
                    </div>
                  ))}

                </div>

                <div className="mt-3">
                  <label>Action Remarks</label>
                  <textarea
                    className="textarea"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Explain action taken"
                  />
                </div>

                <div className="mt-2">
                  <label>Add Photo URL</label>

                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      value={photoInput}
                      onChange={e => setPhotoInput(e.target.value)}
                      placeholder="https://..."
                    />

                    <Button className="btn-secondary btn-sm" onClick={addPhoto}>
                      Add
                    </Button>
                  </div>

                  <div className="pill-grid mt-2">
                    {photos.map((p, i) => (
                      <div key={i} className="pill">
                        Photo {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="mt-4" onClick={submit}>
                  Submit Action
                </Button>

              </Card>
            </div>
          )}

        </div>
      </ModuleGuard>
    </Protected>
  );
}
