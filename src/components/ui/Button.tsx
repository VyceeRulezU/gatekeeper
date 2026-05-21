import React from "react";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ loading = false, disabled, children, className = "", ...rest }) => {
  return (
    <button
      className={`${styles.btn} ${className}`}
      disabled={loading || disabled}
      {...rest}
    >
      {loading ? (
        <span className={styles.loader}>Loading...</span>
      ) : (
        children
      )}
    </button>
  );
};
