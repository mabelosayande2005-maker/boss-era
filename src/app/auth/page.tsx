"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        setError("Wrong password — try again ✦");
        setPw("");
      }
    } catch {
      setError("Something went wrong, try again");
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={submit}
      className="card px-8 py-10 w-full max-w-sm"
      style={{ boxShadow: "0 8px 40px rgba(143,173,160,0.18)" }}
    >
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">👑</div>
        <h1
          className="font-display font-black italic text-3xl"
          style={{ color: "var(--text-dark)" }}
        >
          Boss Era
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-soft)" }}>
          Your private dashboard ✦
        </p>
      </div>

      <div className="mb-3">
        <input
          type="password"
          className="input-fairy w-full"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p
          className="text-sm mb-3 text-center"
          style={{ color: "var(--rose, #e88c8c)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={loading || !pw}
      >
        {loading ? "..." : "Enter ✦"}
      </button>
    </form>
  );
}

export default function AuthPage() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(253,248,236,1) 0%, rgba(250,243,237,1) 50%, rgba(222,238,232,0.9) 100%)",
      }}
    >
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
