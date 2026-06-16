"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { getSupabaseClient, hasSupabaseClientEnv } from "@/lib/supabase-client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!hasSupabaseClientEnv()) {
      setErrorMessage("Password reset email is being migrated to the VPS auth system.");
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        "If an account exists for this email, a password reset link has been sent. Please check your inbox.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send the password reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="mb-6 space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
          Account Recovery
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Forgot Password</h1>
        <p className="text-sm text-slate-500">
          Enter your account email. We will send a secure password reset link.
        </p>
      </div>

      <form onSubmit={handleResetRequest} className="space-y-4">
        <div>
          <label htmlFor="forgot-password-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        {errorMessage ? <p className="text-sm font-medium text-rose-500">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm font-medium leading-6 text-emerald-600">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-[#615FFF] hover:text-[#5552e6]">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
