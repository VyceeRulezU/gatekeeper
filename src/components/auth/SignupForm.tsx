"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/ui/FormError";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Illustration } from "@/components/auth/Illustration";
import { Eye, EyeOff, Globe, ChevronDown } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Signup failed");
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Left branding panel */}
        <div className="auth-left-panel">
          <div className="auth-left-header">
            <h2 className="auth-logo">Gatekeeper</h2>
            <p className="auth-left-description">
              Secure, premium authentication built from the ground up. Your data, your control – no third-party tracking.
            </p>
          </div>
          <div className="auth-illustration-wrapper">
            <Illustration />
          </div>
        </div>

        {/* Right form panel */}
        <div className="auth-right-panel">
          <div className="auth-right-header">
            <button className="lang-selector" type="button">
              <Globe size={13} style={{ marginRight: "3px" }} />
              English (UK)
              <ChevronDown size={11} style={{ marginLeft: "2px" }} />
            </button>
          </div>

          <div className="auth-form-content">
            <h1 className="auth-form-title">Start Using Gatekeeper</h1>
            <p className="auth-form-subtitle">14-day free trial. No credit card required.</p>

            <div className="auth-social-group">
              <button className="auth-social-btn" type="button">
                {/* Inline Google SVG Icon */}
                <svg width="15" height="15" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button className="auth-social-btn" type="button">
                {/* Inline Facebook SVG Icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <FormError>{error}</FormError>}

              <Input
                label="Full Name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{ border: "none", background: "none", cursor: "pointer" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <div className="password-strength-container">
                <PasswordStrength password={password} />
              </div>

              <button className="auth-submit-btn" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <p className="auth-switch-prompt">
              Already have an account?
              <Link href="/login" className="auth-switch-link">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
