"use client";

import React from "react";
import { useEffect, useState } from "react";
import styles from "./PasswordStrength.module.css";

interface StrengthBarProps {
  strength: number; // 0-4
}

const StrengthBar: React.FC<StrengthBarProps> = ({ strength }) => {
  const colors = ["#ff4d4f", "#ffa940", "#faad14", "#a0d911", "#52c41a"]; // red -> green
  return (
    <div className={styles.strengthBar}>
      <div style={{ width: `${(strength / 4) * 100}%`, backgroundColor: colors[strength] }} />
    </div>
  );
};

export const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++; // special char
    if (score > 4) score = 4;
    setStrength(score);
  }, [password]);

  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className={styles.container}>
      <StrengthBar strength={strength} />
      <p className={styles.label}>{labels[strength]}</p>
    </div>
  );
};
