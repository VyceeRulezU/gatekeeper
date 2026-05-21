import React from "react";

interface FormErrorProps {
  message?: string;
  children?: React.ReactNode;
}

export const FormError: React.FC<FormErrorProps> = ({ message, children }) => {
  const content = message || children;
  if (!content) return null;
  return <p className="form-error">{content.toString()}</p>;
};

