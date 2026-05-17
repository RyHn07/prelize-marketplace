"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { getAdminAccessState } from "@/lib/admin-access";
import {
  activateHomepageThemeRequest,
  archiveHomepageThemeRequest,
  duplicateHomepageThemeRequest,
  fetchHomepageThemes,
} from "@/lib/homepage/actions";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { HomepageThemeRow } from "@/types/product-db";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
}

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

export default function ThemesContent() {
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [themes, setThemes] = useState<HomepageThemeRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const loadThemes = async () => {
    try {
      const result = await fetchHomepageThemes();
      setThemes(result.themes ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load homepage themes.");
      setThemes([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      await loadThemes();
      if (isMounted) {
        setLoading(false);
      }
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const runThemeAction = async (url: string) => {
    setErrorMessage("");
    const themeId = url.split("/").at(-2);

    if (!themeId) {
      setErrorMessage("Unable to identify the selected theme.");
      return;
    }

    try {
      if (url.endsWith("/activate")) {
        await activateHomepageThemeRequest(themeId);
      } else if (url.endsWith("/duplicate")) {
        await duplicateHomepageThemeRequest(themeId);
      } else if (url.endsWith("/archive")) {
        await archiveHomepageThemeRequest(themeId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete the theme action.");
      return;
    }

    await loadThemes();
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading homepage themes...</div>;
  }

  if (!userEmail) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Please login as admin.</div>;
  }

  if (!hasAdminAccess) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">You do not have admin access.</div>;
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Homepage Themes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Only one theme is active at a time. The same content stays reusable when you switch designs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {themes.length} visible
            </div>
            <Link
              href="/admin/homepage/themes/new"
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Create Theme
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {themes.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No themes found"
              description="Create your first homepage theme to start managing storefront layouts."
              action={
                <Link
                  href="/admin/homepage/themes/new"
                  className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Create Theme
                </Link>
              }
            />
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[980px]">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>Theme</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Slug</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Updated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {themes.map((theme) => (
                    <tr key={theme.id}>
                      <td className="px-5 py-5 text-left align-top sm:px-6">
                        <p className="text-sm font-medium text-gray-800">{theme.name}</p>
                        {theme.description ? <p className="mt-1 max-w-sm text-xs text-gray-500">{theme.description}</p> : null}
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{theme.slug}</td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              theme.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {theme.is_active ? "Active" : theme.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{formatDate(theme.updated_at)}</td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/admin/homepage/themes/${theme.id}/edit`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
                            Customize
                          </Link>
                          <button
                            type="button"
                            disabled={theme.is_active}
                            onClick={() => void runThemeAction(`/api/admin/homepage/themes/${theme.id}/activate`)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-opacity ${
                              theme.is_active
                                ? "cursor-not-allowed bg-emerald-100 text-emerald-700"
                                : "bg-[#615FFF] text-white hover:opacity-90"
                            }`}
                          >
                            {theme.is_active ? "Active" : "Activate"}
                          </button>
                          <button type="button" onClick={() => void runThemeAction(`/api/admin/homepage/themes/${theme.id}/duplicate`)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
                            Duplicate
                          </button>
                          <button type="button" onClick={() => void runThemeAction(`/api/admin/homepage/themes/${theme.id}/archive`)} className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 hover:text-rose-700">
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
