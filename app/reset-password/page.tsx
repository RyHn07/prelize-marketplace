import { Suspense } from "react";

import Header from "@/components/Header";
import AuthPageHeaderFallback from "@/components/auth/auth-page-header-fallback";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<AuthPageHeaderFallback />}>
        <Header />
      </Suspense>

      <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ResetPasswordForm />
      </section>
    </main>
  );
}
