import React from "react";

export function Card({ title, children, actions }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      {(title || actions) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          {title && <h3 style={{ margin: 0 }}>{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
