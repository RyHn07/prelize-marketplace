"use client";

import { useEffect } from "react";

import { getPgDataClient } from "@/lib/browser-app-client";

export const PASSWORD_RECOVERY_STORAGE_KEY = "prelize-password-recovery";

function markPasswordRecovery() {
  sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, "1");
}

function hasRecoveryParams() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
}

export default function PasswordRecoveryRedirect() {
  useEffect(() => {
    if (hasRecoveryParams()) {
      markPasswordRecovery();
    }

    const {
      data: { subscription },
    } = getPgDataClient().auth.onAuthStateChange((event) => {
      if (event !== "PASSWORD_RECOVERY") {
        return;
      }

      markPasswordRecovery();

      if (window.location.pathname !== "/reset-password") {
        window.location.replace("/reset-password");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
