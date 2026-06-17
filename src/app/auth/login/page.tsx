"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_EMAIL } from "@/lib/types";

export default function LoginPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`Magic link sent to ${email}. Check your inbox.`);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← Back to championships
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Admin sign in</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Only {ADMIN_EMAIL} can input race results. Enter your email to receive a
        magic link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-neutral-400"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-md bg-white px-3 py-2 font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-red-400" : "text-green-400"
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
