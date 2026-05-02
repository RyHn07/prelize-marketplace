"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { fetchVendorOnboardingStatus } from "@/lib/vendor-onboarding";
import {
  listProductMedia,
  removeProductMedia,
  uploadProductMedia,
  type ProductMediaItem,
} from "@/lib/media/storage";

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VendorMediaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [canAccessVendorWorkspace, setCanAccessVendorWorkspace] = useState(false);
  const [items, setItems] = useState<ProductMediaItem[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const selectMode = searchParams.get("select") === "1";
  const mediaTarget = searchParams.get("target") ?? "";
  const returnTo = searchParams.get("returnTo") ?? "/vendor/products/new";

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      try {
        const onboardingStatus = await fetchVendorOnboardingStatus();

        if (!isMounted) {
          return;
        }

        setUserEmail(onboardingStatus.userEmail);
        setVendorId(onboardingStatus.vendorId);
        setCanAccessVendorWorkspace(onboardingStatus.canAccessVendorWorkspace);

        if (!onboardingStatus.userEmail || !onboardingStatus.vendorId || !onboardingStatus.canAccessVendorWorkspace) {
          setLoading(false);
          return;
        }

        const result = await listProductMedia({ vendorId: onboardingStatus.vendorId });

        if (!isMounted) {
          return;
        }

        if (result.error) {
          setErrorMessage(result.error.message);
          setItems([]);
          setLoading(false);
          return;
        }

        setItems(result.data);
        setLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load vendor media.");
        setLoading(false);
      }
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => query.length === 0 || item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  const refreshItems = async (nextVendorId: string) => {
    const refreshed = await listProductMedia({ vendorId: nextVendorId });

    if (refreshed.error) {
      setErrorMessage(refreshed.error.message);
      return;
    }

    setItems(refreshed.data);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0 || !vendorId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let uploadedCount = 0;

      for (const file of files) {
        const result = await uploadProductMedia(file, { vendorId });

        if (result.error || !result.data) {
          setErrorMessage(result.error?.message ?? "Unable to upload image.");
          continue;
        }

        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        await refreshItems(vendorId);
        setSuccessMessage(
          uploadedCount === 1 ? "1 image uploaded to your vendor media." : `${uploadedCount} images uploaded to your vendor media.`,
        );
      }
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (item: ProductMediaItem) => {
    if (!vendorId) {
      return;
    }

    setRemovingPath(item.path);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await removeProductMedia(item.path);

    if (result.error) {
      setErrorMessage(result.error.message);
      setRemovingPath(null);
      return;
    }

    await refreshItems(vendorId);
    setSuccessMessage("Image removed from your vendor media.");
    setRemovingPath(null);
  };

  const handleSelect = (item: ProductMediaItem) => {
    const separator = returnTo.includes("?") ? "&" : "?";
    const destination =
      `${returnTo}${separator}mediaUrl=${encodeURIComponent(item.publicUrl)}` +
      `&mediaTarget=${encodeURIComponent(mediaTarget)}`;

    router.push(destination);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor media...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Media</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access your vendor media.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!canAccessVendorWorkspace || !vendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Media</h1>
        <p className="mt-3 text-sm text-slate-500">Waiting for admin approval.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Media</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vendor Image Library</h1>
            <p className="text-sm text-slate-500">
              {selectMode
                ? "Choose an image from your vendor media library."
                : "Upload, search, and reuse only the images owned by your vendor account."}
            </p>
            <p className="text-xs text-slate-400">Vendor ID: {vendorId}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {isUploading ? "Uploading..." : "Upload Images"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <label htmlFor="vendor-media-search" className="sr-only">
              Search vendor media
            </label>
            <input
              id="vendor-media-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by file name"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </div>
          <p className="text-sm text-slate-500">
            {filteredItems.length} image{filteredItems.length === 1 ? "" : "s"}
          </p>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {filteredItems.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <p className="text-lg font-semibold text-slate-900">No vendor images found</p>
            <p className="mt-2 text-sm text-slate-500">
              Upload your first vendor image to start building your scoped media library.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <article
                key={item.path}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-square bg-slate-100">
                  <div
                    role="img"
                    aria-label={item.name}
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(\"${item.publicUrl}\")` }}
                  />
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">Updated {formatDate(item.updatedAt ?? item.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectMode ? (
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#615FFF] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Use This Image
                      </button>
                    ) : null}
                    <a
                      href={item.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                    >
                      Open
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    disabled={removingPath === item.path}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingPath === item.path ? "Removing..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
