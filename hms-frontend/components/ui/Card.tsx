import React from "react";

export function Card({ title, children, actions }: { title?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
