import React, { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, name, type = "text", rightElement, ...rest }) => {
  const inputId = `${name}-input`;
  return (
    <div className="auth-input-group">
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder=" "
        className="auth-input-field"
        {...rest}
      />
      <label htmlFor={inputId} className="auth-input-label">
        {label}
      </label>
      {rightElement && (
        <span className="auth-input-icon-right">
          {rightElement}
        </span>
      )}
    </div>
  );
};
