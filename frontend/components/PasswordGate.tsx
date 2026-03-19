"use client";

import { useState, useEffect } from "react";

const SESSION_KEY = "copycat_auth";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  const PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

  useEffect(() => {
    if (!PASSWORD) {
      // No password configured — open access
      setUnlocked(true);
    } else if (sessionStorage.getItem(SESSION_KEY) === PASSWORD) {
      setUnlocked(true);
    }
    setReady(true);
  }, [PASSWORD]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, input);
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  // Avoid flash of lock screen on already-authenticated sessions
  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <main className="min-h-screen bg-[#F0E8D0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#1C1209]">CopyCat Scraper</h1>
          <p className="mt-2 text-sm text-[#7A6645]">Enter the password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-xl border border-[#C0B490] bg-[#FAF6EA] px-4 py-3 text-[#1C1209] placeholder-[#9B8660] focus:border-[#2C4A1E] focus:outline-none focus:ring-2 focus:ring-[#B8CCB0]"
          />

          {error && (
            <p className="rounded-lg bg-[#F5ECE8] px-4 py-3 text-sm text-[#8B1A2F]">
              Incorrect password.
            </p>
          )}

          <button
            type="submit"
            className="rounded-xl bg-[#2C4A1E] px-6 py-3 font-semibold text-[#F0E8D0] transition hover:bg-[#1E3414]"
          >
            Unlock
          </button>
        </form>
      </div>
    </main>
  );
}
