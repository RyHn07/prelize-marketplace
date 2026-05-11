"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminPageHeader from "@/components/admin/admin-page-header";
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
    <section className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Homepage"
        title="Homepage Themes"
        description="Only one theme is active at a time. The same content stays reusable when you switch designs."
        actions={
          <Link href="/admin/homepage/themes/new" className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Create Theme
          </Link>
        }
      />

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Theme</th>
                <th className="px-5 py-4 font-medium">Slug</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Preview</th>
                <th className="px-5 py-4 font-medium">Updated</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme.id} className="border-t border-slate-200 align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{theme.name}</p>
                    {theme.description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{theme.description}</p> : null}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{theme.slug}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{theme.status}</span>
                      {theme.is_active ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {theme.preview_image_url ? (
                      <img src={theme.preview_image_url} alt={theme.name} className="h-16 w-24 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-[11px] text-slate-400">
                        No Preview
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(theme.updated_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/homepage/themes/${theme.id}/preview`} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400">
                        Preview
                      </Link>
                      <Link href={`/admin/homepage/themes/${theme.id}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400">
                        Customize
                      </Link>
                      <button type="button" onClick={() => void runThemeAction(`/api/admin/homepage/themes/${theme.id}/activate`)} className="rounded-xl bg-[#615FFF] px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
                        Activate
                      </button>
                      <button type="button" onClick={() => void runThemeAction(`/api/admin/homepage/themes/${theme.id}/duplicate`)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => void runThemeAction(`/api/admin/homepage/themes/${theme.id}/archive`)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">
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
    </section>
  );
}
