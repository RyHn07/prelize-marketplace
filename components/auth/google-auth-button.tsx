"use client";

import { useState } from "react";

import { getSupabaseClient } from "@/lib/supabase-client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.35Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9a6.01 6.01 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98L6.4 13.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1c.79-2.36 3-4.12 5.6-4.12Z"
      />
    </svg>
  );
}

export default function GoogleAuthButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGoogleAuth = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google login failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleGoogleAuth}
        className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <GoogleIcon />
        {isSubmitting ? "Connecting..." : "Continue with Google"}
      </button>

      {errorMessage ? <p className="text-sm font-medium text-rose-500">{errorMessage}</p> : null}
    </div>
  );
}
