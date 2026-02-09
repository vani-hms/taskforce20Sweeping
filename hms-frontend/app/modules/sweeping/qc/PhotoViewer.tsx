"use client";

export default function PhotoViewer({ photos, onClose }: any) {
  if (!photos?.length) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Photo Evidence</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-3">
          {photos.map((p: any, i: number) => (
            <img
              key={i}
              src={p.photoUrl}
              className="rounded-lg border"
              style={{ width: "100%", height: 160, objectFit: "cover" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
