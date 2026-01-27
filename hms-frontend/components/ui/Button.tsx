import React from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
}

export const Button: React.FC<ButtonProps> = ({ variant = "primary", size = "md", children, ...props }) => {
  const className = `btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${props.className ?? ""}`.trim();
  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
};
