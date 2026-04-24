"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Signup successful. You can now log in with your account.");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-6 space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
              Create Account
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Sign Up</h1>
            <p className="text-sm text-slate-500">
              Create your account to continue shopping with Prelize.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                placeholder="Create a password"
                required
              />
            </div>

            <div>
              <label
                htmlFor="signup-confirm-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                placeholder="Confirm your password"
                required
              />
            </div>

            {errorMessage ? (
              <p className="text-sm font-medium text-rose-500">{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className="text-sm font-medium text-emerald-600">{successMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#615FFF] hover:text-[#5552e6]">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
