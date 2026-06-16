import { Suspense } from "react";

import Header from "@/components/Header";
import AuthPageHeaderFallback from "@/components/auth/auth-page-header-fallback";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<AuthPageHeaderFallback />}>
        <Header />
      </Suspense>

      <section className="mx-auto flex max-w-7xl justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
