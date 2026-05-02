"use client";

import { getSupabaseClient } from "@/lib/supabase-client";
import type {
  VendorInvitationStatus,
  VendorMemberStatus,
  VendorStatus,
} from "@/types/product-db";

export type AdminVendorInviteableUser = {
  id: string;
  email: string;
  name: string | null;
  invitationStatus: VendorInvitationStatus | null;
  vendorId: string | null;
  vendorMembershipStatus: VendorMemberStatus | null;
};

export type VendorOnboardingStatusResponse = {
  userId: string | null;
  userEmail: string | null;
  invitationStatus: VendorInvitationStatus | null;
  hasPendingInvitation: boolean;
  hasVendorMembership: boolean;
  vendorId: string | null;
  vendorName: string | null;
  vendorStatus: VendorStatus | null;
  vendorRole: string | null;
  vendorMemberStatus: VendorMemberStatus | null;
  canAccessVendorWorkspace: boolean;
};

export type VendorRegistrationPayload = {
  vendor_name: string;
  slug: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  banner_url: string;
  address: string;
  description: string;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedJsonFetch<T>(input: string, init?: RequestInit) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please login first.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? "Request failed.");
  }

  return body as T;
}

export async function fetchAdminVendorUsers() {
  return authorizedJsonFetch<{ users: AdminVendorInviteableUser[] }>("/api/admin/vendor-users");
}

export async function inviteVendorUser(userId: string) {
  return authorizedJsonFetch<{ success: boolean; invitationStatus: VendorInvitationStatus }>("/api/admin/vendor-invitations", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function fetchVendorOnboardingStatus() {
  return authorizedJsonFetch<VendorOnboardingStatusResponse>("/api/vendor/onboarding-status");
}

export async function registerVendorProfile(payload: VendorRegistrationPayload) {
  return authorizedJsonFetch<{ success: boolean; vendorId: string }>("/api/vendor/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVendorApprovalStatus(vendorId: string, status: "active" | "suspended") {
  return authorizedJsonFetch<{ success: boolean; status: "active" | "suspended" }>(
    `/api/admin/vendors/${vendorId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    },
  );
}
