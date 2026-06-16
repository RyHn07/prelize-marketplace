"use client";

import { useEffect, useState } from "react";

import AdminPageHeader from "@/components/admin/admin-page-header";
import { getAdminAccessState } from "@/lib/admin-access";
import {
  createHomepageBannerRequest,
  deleteHomepageBannerRequest,
  fetchHomepageBanners,
  updateHomepageBannerRequest,
} from "@/lib/homepage/actions";
import { getPgDataClient } from "@/lib/browser-app-client";
import type { HomepageBannerRow } from "@/types/product-db";

type EditableBanner = HomepageBannerRow;

const emptyBanner: Omit<EditableBanner, "id" | "created_at"> = {
  title: null,
  subtitle: null,
  image_url: null,
  link_url: null,
  placement: "promo_banners",
  sort_order: 0,
  start_date: null,
  end_date: null,
  is_active: true,
};

export default function HomepageBannersPage() {
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [banners, setBanners] = useState<EditableBanner[]>([]);
  const [newBanner, setNewBanner] = useState(emptyBanner);
  const [errorMessage, setErrorMessage] = useState("");

  const loadBanners = async () => {
    try {
      const result = await fetchHomepageBanners();
      setBanners(result.banners ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load homepage banners.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(dataClient);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      await loadBanners();
      if (isMounted) {
        setLoading(false);
      }
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveBanner = async (banner: EditableBanner) => {
    try {
      await updateHomepageBannerRequest(banner.id, {
        title: banner.title,
        subtitle: banner.subtitle,
        image_url: banner.image_url,
        link_url: banner.link_url,
        placement: banner.placement,
        sort_order: banner.sort_order,
        start_date: banner.start_date,
        end_date: banner.end_date,
        is_active: banner.is_active,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save banner.");
      return;
    }

    await loadBanners();
  };

  const createBanner = async () => {
    try {
      await createHomepageBannerRequest(newBanner);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create banner.");
      return;
    }

    setNewBanner(emptyBanner);
    await loadBanners();
  };

  const deleteBanner = async (id: string) => {
    try {
      await deleteHomepageBannerRequest(id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete banner.");
      return;
    }

    await loadBanners();
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading homepage banners...</div>;
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
        title="Homepage Banners"
        description="Create promotional banners and control placement, active windows, and sort order."
      />

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create Banner</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input value={newBanner.title ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, title: event.target.value || null }))} placeholder="Title" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input value={newBanner.subtitle ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, subtitle: event.target.value || null }))} placeholder="Subtitle" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input value={newBanner.image_url ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, image_url: event.target.value || null }))} placeholder="Image URL" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input value={newBanner.link_url ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, link_url: event.target.value || null }))} placeholder="Link URL" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input value={newBanner.placement ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, placement: event.target.value || null }))} placeholder="Placement" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input type="number" value={newBanner.sort_order} onChange={(event) => setNewBanner((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} placeholder="Sort order" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input type="datetime-local" value={newBanner.start_date ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, start_date: event.target.value || null }))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input type="datetime-local" value={newBanner.end_date ?? ""} onChange={(event) => setNewBanner((current) => ({ ...current, end_date: event.target.value || null }))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
        </div>
        <button type="button" onClick={() => void createBanner()} className="mt-5 rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
          Add Banner
        </button>
      </div>

      <div className="space-y-5">
        {banners.map((banner) => (
          <div key={banner.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <input value={banner.title ?? ""} onChange={(event) => setBanners((current) => current.map((entry) => entry.id === banner.id ? { ...entry, title: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={banner.subtitle ?? ""} onChange={(event) => setBanners((current) => current.map((entry) => entry.id === banner.id ? { ...entry, subtitle: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={banner.image_url ?? ""} onChange={(event) => setBanners((current) => current.map((entry) => entry.id === banner.id ? { ...entry, image_url: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={banner.link_url ?? ""} onChange={(event) => setBanners((current) => current.map((entry) => entry.id === banner.id ? { ...entry, link_url: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={banner.placement ?? ""} onChange={(event) => setBanners((current) => current.map((entry) => entry.id === banner.id ? { ...entry, placement: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input type="number" value={banner.sort_order} onChange={(event) => setBanners((current) => current.map((entry) => entry.id === banner.id ? { ...entry, sort_order: Number(event.target.value) || 0 } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void saveBanner(banner)} className="rounded-xl bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Save</button>
              <button type="button" onClick={() => void deleteBanner(banner.id)} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
