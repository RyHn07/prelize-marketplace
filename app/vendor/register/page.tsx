"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import VendorForm, { DEFAULT_VENDOR_FORM_VALUES } from "@/components/vendor/vendor-form";
import { fetchVendorOnboardingStatus, registerVendorProfile } from "@/lib/vendor-onboarding";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { VendorFormValues } from "@/types/product-db";

function toRegistrationPayload(values: VendorFormValues) {
  return {
    vendor_name: values.name,
    slug: values.slug,
    contact_email: values.contact_email,
    contact_phone: values.contact_phone,
    logo_url: values.logo_url,
    banner_url: values.banner_url,
    address: values.address,
    description: values.description,
  };
}

export default function VendorRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [canRegister, setCanRegister] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [initialValues, setInitialValues] = useState<VendorFormValues>(DEFAULT_VENDOR_FORM_VALUES);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadStatus = async () => {
      try {
        const [{ data: authData }, onboardingStatus] = await Promise.all([
          supabase.auth.getUser(),
          fetchVendorOnboardingStatus(),
        ]);

        if (!isMounted) {
          return;
        }

        const email = authData.user?.email ?? onboardingStatus.userEmail ?? null;
        const nextUserId = authData.user?.id ?? onboardingStatus.userId ?? null;
        setUserEmail(email);
        setUserId(nextUserId);

        if (onboardingStatus.canAccessVendorWorkspace) {
          router.replace("/vendor");
          return;
        }

        if (!onboardingStatus.hasPendingInvitation) {
          setCanRegister(false);
          setLoading(false);
          return;
        }

        setInitialValues({
          ...DEFAULT_VENDOR_FORM_VALUES,
          contact_email: email ?? "",
        });
        setCanRegister(true);
        setLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to open vendor registration.");
        setLoading(false);
      }
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading vendor registration...
        </div>
      </section>
    );
  }

  if (!userEmail) {
    return (
      <section className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Registration</h1>
          <p className="mt-3 text-sm text-slate-500">Please login first.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Go to Login
          </Link>
        </div>
      </section>
    );
  }

  if (!canRegister) {
    return (
      <section className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Registration</h1>
          <p className="mt-3 text-sm text-slate-500">You are not invited as a vendor.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/vendor"
          className="inline-flex text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
        >
          Back to Vendor Entry
        </Link>
      </div>

      <VendorForm
        key="vendor-register"
        initialValues={initialValues}
        title="Complete Vendor Registration"
        submitLabel="Submit Vendor Registration"
        isSubmitting={saving}
        errorMessage={errorMessage}
        successMessage={successMessage}
        showStatusControls={false}
        imageInputMode="upload"
        uploadOwnerId={userId}
        onSubmit={async (values) => {
          if (!values.name.trim()) {
            setErrorMessage("Vendor name is required.");
            return;
          }

          setSaving(true);
          setErrorMessage("");
          setSuccessMessage("");

          try {
            await registerVendorProfile(toRegistrationPayload(values));
            setSuccessMessage("Vendor registration submitted. Waiting for admin approval.");
            router.replace("/vendor");
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to submit vendor registration.");
          } finally {
            setSaving(false);
          }
        }}
      />
    </section>
  );
}
