import React from "react";

interface Props {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<Props> = ({ label, hint, children }) => (
  <div className="form-field">
    <label>{label}</label>
    {children}
    {hint && <small style={{ color: "var(--muted)" }}>{hint}</small>}
  </div>
);
