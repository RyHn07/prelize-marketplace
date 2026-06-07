"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import {
  listProductMedia,
  removeProductMedia,
  uploadProductMedia,
  type ProductMediaItem,
} from "@/lib/media/storage";
import { fetchVendorOnboardingStatus } from "@/lib/vendor-onboarding";

type DateFilter = "all" | "week" | "month" | "older";
type MediaTab = "upload" | "library";

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

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
        fill="currentColor"
      />
    </svg>
  );
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [filterNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<MediaTab>("library");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
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

    return items.filter((item) => {
      const matchesSearch = query.length === 0 || item.name.toLowerCase().includes(query);
      const timestamp = new Date(item.updatedAt ?? item.createdAt ?? "").getTime();
      const ageInDays = Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : (filterNow - timestamp) / (1000 * 60 * 60 * 24);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "week" && ageInDays <= 7) ||
        (dateFilter === "month" && ageInDays <= 30) ||
        (dateFilter === "older" && ageInDays > 30);

      return matchesSearch && matchesDate;
    });
  }, [dateFilter, filterNow, items, searchQuery]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.path === selectedPath) ?? null,
    [filteredItems, selectedPath],
  );

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || !vendorId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const uploadedItems: ProductMediaItem[] = [];

      for (const file of files) {
        const result = await uploadProductMedia(file, { vendorId });

        if (result.error || !result.data) {
          setErrorMessage(result.error?.message ?? "Unable to upload image.");
          continue;
        }

        uploadedItems.push(result.data);
      }

      if (uploadedItems.length > 0) {
        const refreshed = await listProductMedia({ vendorId });

        if (refreshed.error) {
          setErrorMessage(refreshed.error.message);
        } else {
          setItems(refreshed.data);
          setSelectedPath(uploadedItems[0]?.path ?? null);
          setActiveTab("library");
          setSuccessMessage(
            uploadedItems.length === 1
              ? "1 image uploaded to your vendor media."
              : `${uploadedItems.length} images uploaded to your vendor media.`,
          );
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await uploadFiles(files);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);

    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
    await uploadFiles(files);
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setSuccessMessage("Image URL copied.");
      setErrorMessage("");
    } catch {
      setErrorMessage("Unable to copy the image URL.");
    }
  };

  const handleDelete = async (item: ProductMediaItem) => {
    setRemovingPath(item.path);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await removeProductMedia(item.path);

    if (result.error) {
      setErrorMessage(result.error.message);
      setRemovingPath(null);
      return;
    }

    setItems((current) => current.filter((entry) => entry.path !== item.path));
    if (selectedPath === item.path) {
      setSelectedPath(null);
    }
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
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading media library...</div>;
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Media Library</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access your vendor media.</p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!canAccessVendorWorkspace || !vendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Media Library</h1>
        <p className="mt-3 text-sm text-slate-500">Waiting for admin approval.</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white">
        <div className="flex items-center gap-8 border-b border-gray-200 px-6 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`border-b-2 px-0 py-3 text-base font-semibold transition-colors hover:text-slate-700 ${
              activeTab === "upload" ? "border-[#615FFF] text-[#615FFF]" : "border-transparent text-slate-500"
            }`}
          >
            Upload files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`border-b-2 px-0 py-3 text-base font-semibold transition-colors hover:text-slate-700 ${
              activeTab === "library" ? "border-[#615FFF] text-[#615FFF]" : "border-transparent text-slate-500"
            }`}
          >
            Media Library
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </div>

        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value="vendor-media" disabled className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none disabled:cursor-default disabled:opacity-100">
              <option>Vendor media items</option>
            </select>

            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            >
              <option value="all">All dates</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="older">Older</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">{filteredItems.length} visible</div>

            <div className="relative w-full min-w-[280px] max-w-[420px]">
              <label htmlFor="media-search" className="sr-only">Search media</label>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><SearchIcon /></span>
              <input
                id="media-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search media"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
              />
            </div>
          </div>
        </div>

        {errorMessage ? <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">{errorMessage}</div> : null}
        {successMessage ? <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">{successMessage}</div> : null}

        {activeTab === "upload" ? (
          <div className="grid min-h-[620px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border-b border-gray-200 xl:border-b-0 xl:border-r xl:border-gray-200">
              <div className="flex h-full items-center justify-center p-6">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget === event.target) {
                      setIsDraggingOver(false);
                    }
                  }}
                  onDrop={(event) => void handleDrop(event)}
                  className={`flex min-h-[360px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed px-6 py-12 text-center transition-colors ${
                    isDraggingOver ? "border-[#615FFF] bg-[#615FFF]/5" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 13.75V4.583M10 4.583 6.25 8.333M10 4.583l3.75 3.75M4.583 15.417h10.834" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="mt-6 text-[28px] font-semibold text-slate-900">Click to upload or drag and drop</p>
                  <p className="mt-4 max-w-2xl text-base text-slate-500">SVG, PNG, JPG or GIF files can be uploaded here and stored in your vendor media library.</p>
                  {isUploading ? <span className="mt-6 inline-flex rounded-full bg-[#615FFF]/10 px-4 py-2 text-sm font-semibold text-[#615FFF]">Uploading...</span> : null}
                </button>
              </div>
            </div>

            <aside className="bg-white">
              <div className="border-b border-gray-200 px-6 py-6">
                <h4 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-700">Attachment Details</h4>
              </div>
              <div className="p-6">
                <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm leading-6 text-slate-500">Click an image to see its attachment details.</div>
              </div>
            </aside>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState title="No images found" description="Upload your first image to start building the product media library." />
          </div>
        ) : (
          <div className="grid min-h-[620px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="border-b border-gray-200 xl:border-b-0 xl:border-r xl:border-gray-200">
              <div className="max-h-[620px] overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                  {filteredItems.map((item) => {
                    const isActive = selectedPath === item.path;

                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => setSelectedPath(item.path)}
                        className={`overflow-hidden rounded-2xl border bg-white text-left transition-all ${
                          isActive ? "border-[#615FFF] shadow-[0_0_0_3px_rgba(97,95,255,0.12)]" : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300"
                        }`}
                      >
                        <div className="aspect-square bg-slate-100">
                          <div role="img" aria-label={item.name} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${item.publicUrl}")` }} />
                        </div>
                        <div className="border-t border-slate-100 px-3 py-2">
                          <p className="truncate text-sm font-medium text-slate-700">{item.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="bg-white">
              <div className="border-b border-gray-200 px-6 py-6">
                <h4 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-700">Attachment Details</h4>
              </div>

              <div className="p-6">
                {selectedItem ? (
                  <div className="space-y-5">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <div role="img" aria-label={selectedItem.name} className="aspect-square w-full bg-cover bg-center" style={{ backgroundImage: `url("${selectedItem.publicUrl}")` }} />
                    </div>

                    <div className="space-y-3 text-sm text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-900">{selectedItem.name}</p>
                        <p className="mt-1 break-all text-xs text-slate-500">{selectedItem.path}</p>
                      </div>
                      <div className="space-y-1">
                        <p>Uploaded: {formatDate(selectedItem.createdAt)}</p>
                        <p>Updated: {formatDate(selectedItem.updatedAt ?? selectedItem.createdAt)}</p>
                        <p>Alt text: {selectedItem.altText?.trim() || "Not set"}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectMode ? (
                        <button type="button" onClick={() => handleSelect(selectedItem)} className="inline-flex w-full items-center justify-center rounded-xl bg-[#615FFF] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                          Use This Image
                        </button>
                      ) : null}
                      <button type="button" onClick={() => void handleCopy(selectedItem.publicUrl)} className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
                        Copy URL
                      </button>
                      <a href={selectedItem.publicUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
                        Open File
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDelete(selectedItem)}
                        disabled={removingPath === selectedItem.path}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingPath === selectedItem.path ? "Removing..." : "Delete Permanently"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm leading-6 text-slate-500">Click an image to see its attachment details.</div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
