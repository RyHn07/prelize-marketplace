"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { PASSWORD_RECOVERY_STORAGE_KEY } from "@/components/auth/password-recovery-redirect";
import { getSupabaseClient, hasSupabaseClientEnv } from "@/lib/supabase-client";

type RecoveryState = "checking" | "ready" | "invalid" | "complete";

function getRecoveryErrorFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("error_description") ||
    hashParams.get("error_description") ||
    searchParams.get("error") ||
    hashParams.get("error") ||
    ""
  );
}

function hasRecoveryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery" ||
    Boolean(searchParams.get("code")) ||
    Boolean(hashParams.get("access_token"))
  );
}

export default function ResetPasswordForm() {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!hasSupabaseClientEnv()) {
      setErrorMessage("Password reset links are being migrated to the VPS auth system.");
      setRecoveryState("invalid");
      return;
    }

    let isMounted = true;
    const recoveryParamsFound = hasRecoveryParams();

    if (recoveryParamsFound) {
      sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, "1");
    }

    const supabase = getSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryState("ready");
        setErrorMessage("");
      }
    });

    const validateRecoverySession = async () => {
      const urlError = getRecoveryErrorFromUrl();
      const hasRecoveryMarker = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "1";

      if (urlError) {
        sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
        setErrorMessage(urlError);
        setRecoveryState("invalid");
        return;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !session || (!recoveryParamsFound && !hasRecoveryMarker)) {
        setErrorMessage("This password reset link is invalid or has expired. Request a new reset link.");
        setRecoveryState("invalid");
        return;
      }

      setRecoveryState("ready");
    };

    void validateRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await supabase.auth.signOut();
      sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      setNewPassword("");
      setConfirmPassword("");
      setRecoveryState("complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your password.");
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
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Reset Password</h1>
        <p className="text-sm text-slate-500">
          Set a new password for your marketplace account.
        </p>
      </div>

      {recoveryState === "checking" ? (
        <p className="text-sm text-slate-500">Checking your secure reset link...</p>
      ) : null}

      {recoveryState === "invalid" ? (
        <div className="space-y-5">
          <p className="text-sm font-medium leading-6 text-rose-500">{errorMessage}</p>
          <Link
            href="/forgot-password"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
          >
            Request a new reset link
          </Link>
        </div>
      ) : null}

      {recoveryState === "ready" ? (
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label htmlFor="reset-password-new" className="mb-1.5 block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="reset-password-new"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              placeholder="Create a new password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div>
            <label htmlFor="reset-password-confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              placeholder="Confirm your new password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {errorMessage ? <p className="text-sm font-medium text-rose-500">{errorMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Updating password..." : "Update password"}
          </button>
        </form>
      ) : null}

      {recoveryState === "complete" ? (
        <div className="space-y-5">
          <p className="text-sm font-medium leading-6 text-emerald-600">
            Your password has been updated successfully. Please log in with your new password.
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
          >
            Go to Login
          </Link>
        </div>
      ) : null}

      {recoveryState !== "complete" ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          Back to{" "}
          <Link href="/login" className="font-semibold text-[#615FFF] hover:text-[#5552e6]">
            Login
          </Link>
        </p>
      ) : null}
    </div>
  );
}
