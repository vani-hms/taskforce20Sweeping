import React from "react";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button: React.FC<ButtonProps> = ({ variant = "primary", children, ...props }) => {
  const className = `btn btn-${variant} ${props.className ?? ""}`.trim();
  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
};
