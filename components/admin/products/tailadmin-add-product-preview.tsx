"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";

import {
  listProductMedia,
  removeProductMedia,
  upsertProductMediaAltText,
  type ProductMediaItem,
  uploadProductMedia,
} from "@/lib/media/storage";

import TailadminProductDataPreview from "./tailadmin-product-data-preview";

type SpecificationPreviewRow = {
  id: string;
  label: string;
  value: string;
};

type GalleryModalProps = {
  isOpen: boolean;
  target: "gallery" | "main-image" | `variation:${string}`;
  currentMainImage: string;
  vendorId: string;
  onClose: () => void;
  onConfirmSelection: (imageUrls: string[]) => void;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
        <h3 className="text-base font-medium text-gray-800">{title}</h3>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

const PRODUCT_MEDIA_TILE_SIZE = 196;

function StyledSelect({
  id,
  value,
  placeholder,
  options,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-400 shadow-sm focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-gray-700">
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function GalleryLibraryModal({
  isOpen,
  target,
  currentMainImage,
  vendorId,
  onClose,
  onConfirmSelection,
}: GalleryModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "library">("library");
  const [libraryImages, setLibraryImages] = useState<ProductMediaItem[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const allowMultiple = target === "gallery";
  const [altTextDraft, setAltTextDraft] = useState("");
  const [isSavingAltText, setIsSavingAltText] = useState(false);
  const [altTextMessage, setAltTextMessage] = useState("");

  const filteredImages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return libraryImages;
    }

    return libraryImages.filter(
      (image) =>
        image.name.toLowerCase().includes(query) ||
        image.publicUrl.toLowerCase().includes(query),
    );
  }, [libraryImages, searchQuery]);

  const activeAttachment = useMemo(() => {
    const activeUrl = selectedImages[selectedImages.length - 1];

    if (!activeUrl) {
      return null;
    }

    return libraryImages.find((image) => image.publicUrl === activeUrl) ?? null;
  }, [libraryImages, selectedImages]);

  useEffect(() => {
    setAltTextDraft(activeAttachment?.altText ?? "");
    setAltTextMessage("");
  }, [activeAttachment?.path, activeAttachment?.altText]);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadLibrary = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const scopedResult = await listProductMedia({ vendorId: vendorId || null });

        if (!isMounted) {
          return;
        }

        if (scopedResult.error) {
          setLibraryImages([]);
          setErrorMessage(scopedResult.error.message);
          return;
        }

        if (scopedResult.data.length > 0 || !vendorId) {
          setLibraryImages(scopedResult.data);
          return;
        }

        const fallbackResult = await listProductMedia();

        if (!isMounted) {
          return;
        }

        if (fallbackResult.error) {
          setLibraryImages([]);
          setErrorMessage(fallbackResult.error.message);
          return;
        }

        setLibraryImages(fallbackResult.data);
      } catch (error) {
        if (isMounted) {
          setLibraryImages([]);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load media library.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setSelectedImages([]);
    void loadLibrary();

    return () => {
      isMounted = false;
    };
  }, [isOpen, vendorId]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const handlePermanentDelete = async () => {
    if (!activeAttachment) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${activeAttachment.name}" permanently from the media library?`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const result = await removeProductMedia(activeAttachment.path);

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      setLibraryImages((current) =>
        current.filter((image) => image.path !== activeAttachment.path),
      );
      setSelectedImages((current) =>
        current.filter((imageUrl) => imageUrl !== activeAttachment.publicUrl),
      );

      window.dispatchEvent(
        new CustomEvent("prelize:remove-gallery-image", {
          detail: { imageUrl: activeAttachment.publicUrl },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("prelize:set-main-image", {
          detail: {
            imageUrl:
              currentMainImage === activeAttachment.publicUrl ? "" : currentMainImage,
          },
        }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete image permanently.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAltTextSave = async () => {
    if (!activeAttachment) {
      return;
    }

    const normalizedDraft = altTextDraft.trim();
    const currentAltText = activeAttachment.altText?.trim() ?? "";

    if (normalizedDraft === currentAltText) {
      return;
    }

    setIsSavingAltText(true);
    setAltTextMessage("");
    setErrorMessage("");

    try {
      const result = await upsertProductMediaAltText(
        activeAttachment.path,
        normalizedDraft.length > 0 ? normalizedDraft : null,
      );

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      setLibraryImages((current) =>
        current.map((image) =>
          image.path === activeAttachment.path
            ? {
                ...image,
                altText: result.data?.alt_text ?? null,
              }
            : image,
        ),
      );
      setAltTextMessage("Alt text saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save alt text.");
    } finally {
      setIsSavingAltText(false);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages((current) => {
      if (allowMultiple) {
        return current.includes(imageUrl)
          ? current.filter((item) => item !== imageUrl)
          : [...current, imageUrl];
      }

      return current.includes(imageUrl) ? [] : [imageUrl];
    });
  };

  const processUploadFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const uploadResults = await Promise.all(
        files.map((file) => uploadProductMedia(file, { vendorId: vendorId || null })),
      );

      const failedUpload = uploadResults.find((result) => result.error);

      if (failedUpload?.error) {
        setErrorMessage(failedUpload.error.message);
      }

      const uploadedImages = uploadResults
        .map((result) => result.data)
        .filter((item): item is ProductMediaItem => item !== null);

      if (uploadedImages.length > 0) {
        setLibraryImages((current) => [...uploadedImages, ...current]);
        setSelectedImages((current) => [
          ...current,
          ...uploadedImages
            .map((image) => image.publicUrl)
            .filter((imageUrl) => !current.includes(imageUrl)),
        ]);
        setActiveTab("library");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload media.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await processUploadFiles(files);
    event.target.value = "";
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="flex h-[88vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-[32px] font-semibold tracking-[-0.02em] text-slate-900">
              {target === "gallery"
                ? "Add images to product gallery"
                : target === "main-image"
                  ? "Select product image"
                  : "Select variation image"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {target === "gallery"
                ? "Load media from the real library or upload new files, then add selected images to this product."
                : target === "main-image"
                  ? "Choose one image from the real library or upload a new one for the main product image."
                  : "Choose one image from the real library or upload a new one for this variation."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close gallery modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 pt-4">
          <div className="flex flex-wrap items-center gap-6">
            {[
              { id: "upload" as const, label: "Upload files" },
              { id: "library" as const, label: "Media Library" },
            ].map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-1 pb-4 pt-1 text-base font-medium transition-colors ${
                    active
                      ? "border-[#615FFF] text-[#615FFF]"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#615FFF]">
                  <option>All media items</option>
                </select>
                <select className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#615FFF]">
                  <option>All dates</option>
                </select>
              </div>

              <div className="w-full max-w-sm">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search media"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#615FFF]"
                />
              </div>
            </div>

            {activeTab === "upload" ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      return;
                    }
                    setIsDragActive(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragActive(false);
                    void processUploadFiles(Array.from(event.dataTransfer.files ?? []));
                  }}
                  className={`w-full max-w-none rounded-[24px] border border-dashed px-8 py-16 text-center transition-colors ${
                    isDragActive
                      ? "border-[#615FFF]/50 bg-[#615FFF]/[0.05]"
                      : "border-slate-300 bg-white hover:border-[#615FFF]/35 hover:bg-slate-50/70"
                  }`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                      <path d="M13 17.333V8.12467M13 8.12467L9.74984 11.3748M13 8.12467L16.2502 11.3748" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.50016 18.9583C6.50016 20.155 7.47088 21.1257 8.66756 21.1257H17.3342C18.5309 21.1257 19.5016 20.155 19.5016 18.9583" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="mt-5 text-lg font-medium text-slate-900">
                    {isUploading ? "Uploading files..." : "Click to upload or drag and drop"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    SVG, PNG, JPG or GIF files can be uploaded here and stored in the real media library.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Recommended image ratio depends on your product gallery use case.</p>
                  <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                </button>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {errorMessage ? (
                  <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {errorMessage}
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500">Loading media library...</div>
                ) : filteredImages.length === 0 ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                    No media items found.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {filteredImages.map((image) => {
                      const selected = selectedImages.includes(image.publicUrl);

                      return (
                        <button
                          key={image.path}
                          type="button"
                          onClick={() => toggleImageSelection(image.publicUrl)}
                          className={`group relative overflow-hidden rounded-2xl border bg-white text-left transition-all ${
                            selected
                              ? "border-[#615FFF] ring-2 ring-[#615FFF]/20"
                              : "border-slate-200 hover:border-[#615FFF]/40"
                          }`}
                        >
                          <div
                            role="img"
                            aria-label={image.name}
                            className="aspect-square bg-slate-100 bg-cover bg-center"
                            style={{ backgroundImage: `url("${image.publicUrl}")` }}
                          />
                          <div className="border-t border-slate-100 px-3 py-2">
                            <p className="truncate text-xs font-medium text-slate-700">{image.name}</p>
                          </div>
                          {selected ? (
                            <div className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#615FFF] text-white shadow-sm">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 border-l border-slate-200 bg-slate-50/70 xl:flex xl:flex-col">
            <div className="flex min-h-[72px] items-center border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">Attachment Details</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {activeAttachment ? (
                  <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div
                      role="img"
                      aria-label={activeAttachment.name}
                      className="h-28 w-24 shrink-0 rounded-md border border-slate-200 bg-white bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${activeAttachment.publicUrl}")` }}
                    />
                    <div className="min-w-0 space-y-1 text-sm text-slate-600">
                      <p className="break-all font-medium text-slate-900">{activeAttachment.name}</p>
                      <p>{activeAttachment.createdAt ? new Date(activeAttachment.createdAt).toLocaleDateString() : "Unknown date"}</p>
                      <button
                        type="button"
                        onClick={() => void handlePermanentDelete()}
                        disabled={isDeleting}
                        className="block text-left text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete permanently"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-5">
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-3">
                      <label className="pt-2 text-right text-sm text-slate-600">Alt Text</label>
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={altTextDraft}
                          onChange={(event) => setAltTextDraft(event.target.value)}
                          onBlur={() => void handleAltTextSave()}
                          placeholder="Describe this image for SEO and accessibility"
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#615FFF]"
                        />
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-slate-500">Use clear, descriptive text for search engines and screen readers.</span>
                          <span className={isSavingAltText ? "text-[#615FFF]" : "text-emerald-600"}>
                            {isSavingAltText ? "Saving..." : altTextMessage}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
                      <label className="text-right text-sm text-slate-600">Title</label>
                      <input
                        type="text"
                        defaultValue={activeAttachment.name}
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#615FFF]"
                      />
                    </div>

                    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
                      <label className="text-right text-sm text-slate-600">File URL:</label>
                      <div>
                        <input
                          type="text"
                          value={activeAttachment.publicUrl}
                          readOnly
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  Click an image to see its attachment details.
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-slate-500">
            {target === "gallery"
              ? "Click images to select multiple items. Selected images will be added to the real product gallery field and saved with the product."
              : "Click one image to use it as the main product image. The selected image will be saved with the product."}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmSelection(selectedImages)}
              disabled={selectedImages.length === 0}
              className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {target === "gallery" ? "Add to gallery" : "Use image"}{" "}
              {selectedImages.length > 0 ? `(${selectedImages.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function TailadminAddProductPreview() {
  const [productName, setProductName] = useState("");
  const [vendorValue, setVendorValue] = useState("");
  const [brandValue, setBrandValue] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const [vendorOptions, setVendorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [brandOptions, setBrandOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [specifications, setSpecifications] = useState<SpecificationPreviewRow[]>([]);
  const [mainImage, setMainImage] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [openMediaTarget, setOpenMediaTarget] = useState<"gallery" | "main-image" | `variation:${string}` | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [pendingSubmitStatus, setPendingSubmitStatus] = useState<"active" | "draft" | null>(null);
  const [draggedGalleryIndex, setDraggedGalleryIndex] = useState<number | null>(null);

  const submitRealProductForm = (status: "active" | "draft") => {
    if (typeof document === "undefined" || typeof window === "undefined" || isSubmittingProduct) {
      return;
    }

    setPendingSubmitStatus(status);

    window.dispatchEvent(
      new CustomEvent("prelize:set-product-status", {
        detail: { status },
      }),
    );

    const form = document.getElementById("product-editor-form") as HTMLFormElement | null;
    window.requestAnimationFrame(() => {
      form?.requestSubmit();
    });
  };

  const syncFieldValue = (inputId: string, value: string) => {
    if (typeof document === "undefined") {
      return;
    }

    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const syncGalleryImageOrder = (nextImages: string[]) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("prelize:set-gallery-images-order", {
        detail: {
          images: nextImages,
        },
      }),
    );
  };

  const syncSpecificationsState = (nextSpecifications: SpecificationPreviewRow[]) => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("prelize:set-specifications-state", {
        detail: {
          specifications: nextSpecifications,
        },
      }),
    );
  };

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncFromRealForm = () => {
      const productNameInput = document.getElementById("product-name") as HTMLInputElement | null;
      const vendorSelect = document.getElementById("product-vendor") as HTMLSelectElement | null;
      const brandSelect = document.getElementById("product-brand") as HTMLSelectElement | null;
      const categorySelect = document.getElementById("product-category") as HTMLSelectElement | null;

      setProductName(productNameInput?.value ?? "");
      setVendorValue(vendorSelect?.value ?? "");
      setBrandValue(brandSelect?.value ?? "");
      setCategoryValue(categorySelect?.value ?? "");
      setVendorOptions(
        vendorSelect
          ? Array.from(vendorSelect.options).map((option) => ({
              value: option.value,
              label: option.text,
            }))
          : [],
      );
      setBrandOptions(
        brandSelect
          ? Array.from(brandSelect.options).map((option) => ({
              value: option.value,
              label: option.text,
            }))
          : [],
      );
      setCategoryOptions(
        categorySelect
          ? Array.from(categorySelect.options).map((option) => ({
              value: option.value,
              label: option.text,
            }))
          : [],
      );
    };

    syncFromRealForm();

    const productNameInput = document.getElementById("product-name") as HTMLInputElement | null;
    const vendorSelect = document.getElementById("product-vendor") as HTMLSelectElement | null;
    const brandSelect = document.getElementById("product-brand") as HTMLSelectElement | null;
    const categorySelect = document.getElementById("product-category") as HTMLSelectElement | null;

    const handleNameInput = () => syncFromRealForm();
    const handleVendorChange = () => syncFromRealForm();
    const handleBrandChange = () => syncFromRealForm();
    const handleCategoryChange = () => syncFromRealForm();

    productNameInput?.addEventListener("input", handleNameInput);
    vendorSelect?.addEventListener("change", handleVendorChange);
    brandSelect?.addEventListener("change", handleBrandChange);
    categorySelect?.addEventListener("change", handleCategoryChange);

    const vendorObserver =
      vendorSelect
        ? new MutationObserver(() => {
            syncFromRealForm();
          })
        : null;
    const brandObserver =
      brandSelect
        ? new MutationObserver(() => {
            syncFromRealForm();
          })
        : null;
    const categoryObserver =
      categorySelect
        ? new MutationObserver(() => {
            syncFromRealForm();
          })
        : null;

    if (vendorSelect && vendorObserver) {
      vendorObserver.observe(vendorSelect, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "disabled"],
      });
    }
    if (brandSelect && brandObserver) {
      brandObserver.observe(brandSelect, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "disabled"],
      });
    }
    if (categorySelect && categoryObserver) {
      categoryObserver.observe(categorySelect, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "disabled"],
      });
    }

    const timer = window.setTimeout(syncFromRealForm, 400);

    return () => {
      window.clearTimeout(timer);
      productNameInput?.removeEventListener("input", handleNameInput);
      vendorSelect?.removeEventListener("change", handleVendorChange);
      brandSelect?.removeEventListener("change", handleBrandChange);
      categorySelect?.removeEventListener("change", handleCategoryChange);
      vendorObserver?.disconnect();
      brandObserver?.disconnect();
      categoryObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleOpenMediaModal = (event: Event) => {
      const customEvent = event as CustomEvent<{
        target?: "gallery" | "main-image" | `variation:${string}`;
      }>;

      if (!customEvent.detail?.target) {
        return;
      }

      setOpenMediaTarget(customEvent.detail.target);
    };

    window.addEventListener("prelize:open-media-modal", handleOpenMediaModal as EventListener);

    return () => {
      window.removeEventListener("prelize:open-media-modal", handleOpenMediaModal as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleProductSubmitStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ isSubmitting?: boolean }>;
      const nextIsSubmitting = Boolean(customEvent.detail?.isSubmitting);

      setIsSubmittingProduct(nextIsSubmitting);

      if (!nextIsSubmitting) {
        setPendingSubmitStatus(null);
      }
    };

    window.addEventListener("prelize:product-submit-state-updated", handleProductSubmitStateUpdated as EventListener);

    return () => {
      window.removeEventListener("prelize:product-submit-state-updated", handleProductSubmitStateUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncMainImageFromRealForm = () => {
      const section = document.getElementById("product-main-image-section");
      setMainImage(section?.getAttribute("data-product-main-image") ?? "");
    };

    syncMainImageFromRealForm();

    const mainImageSection = document.getElementById("product-main-image-section");
    const observer =
      mainImageSection
        ? new MutationObserver(() => {
            syncMainImageFromRealForm();
          })
        : null;

    if (mainImageSection && observer) {
      observer.observe(mainImageSection, {
        attributes: true,
        attributeFilter: ["data-product-main-image"],
      });
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncGalleryFromRealForm = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-gallery-row='true']"),
      );

      const nextImages = realRows
        .map((row) => row.dataset.productGalleryImage ?? "")
        .filter((image): image is string => image.trim().length > 0);

      setGalleryImages(nextImages);
    };

    syncGalleryFromRealForm();

    const gallerySection = document.getElementById("product-gallery-section");
    const galleryObserver =
      gallerySection
        ? new MutationObserver(() => {
            syncGalleryFromRealForm();
          })
        : null;

    if (gallerySection && galleryObserver) {
      galleryObserver.observe(gallerySection, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-product-gallery-image"],
      });
    }

    const handleMediaStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        mainImage?: string;
        galleryImages?: string[];
      }>;

      if (Array.isArray(customEvent.detail?.galleryImages)) {
        setGalleryImages(customEvent.detail.galleryImages.filter((image) => image.trim().length > 0));
      }

      if (typeof customEvent.detail?.mainImage === "string") {
        setMainImage(customEvent.detail.mainImage);
      }
    };

    window.addEventListener("prelize:media-state-updated", handleMediaStateUpdated as EventListener);

    return () => {
      window.removeEventListener("prelize:media-state-updated", handleMediaStateUpdated as EventListener);
      galleryObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncSpecificationsFromRealForm = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-spec-row='true']"),
      );

      const nextRows = realRows.map((row, index) => {
        const specId = row.dataset.productSpecId ?? `spec-${index + 1}`;
        const labelInput = document.getElementById(`product-spec-label-${specId}`) as HTMLInputElement | null;
        const valueInput = document.getElementById(`product-spec-value-${specId}`) as HTMLInputElement | null;

        return {
          id: specId,
          label: labelInput?.value ?? "",
          value: valueInput?.value ?? "",
        };
      });

      setSpecifications(nextRows.length > 0 ? nextRows : [{ id: "preview-fallback", label: "", value: "" }]);
    };

    const wireSpecificationInputs = () => {
      const realRows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-product-spec-row='true']"),
      );

      realRows.forEach((row) => {
        const specId = row.dataset.productSpecId;
        if (!specId) {
          return;
        }

        const labelInput = document.getElementById(`product-spec-label-${specId}`) as HTMLInputElement | null;
        const valueInput = document.getElementById(`product-spec-value-${specId}`) as HTMLInputElement | null;

        labelInput?.addEventListener("input", syncSpecificationsFromRealForm);
        valueInput?.addEventListener("input", syncSpecificationsFromRealForm);
      });

      return () => {
        realRows.forEach((row) => {
          const specId = row.dataset.productSpecId;
          if (!specId) {
            return;
          }

          const labelInput = document.getElementById(`product-spec-label-${specId}`) as HTMLInputElement | null;
          const valueInput = document.getElementById(`product-spec-value-${specId}`) as HTMLInputElement | null;

          labelInput?.removeEventListener("input", syncSpecificationsFromRealForm);
          valueInput?.removeEventListener("input", syncSpecificationsFromRealForm);
        });
      };
    };

    syncSpecificationsFromRealForm();

    const realAddButton = document.getElementById("product-specifications-add");
    realAddButton?.addEventListener("click", syncSpecificationsFromRealForm);

    const section = document.getElementById("product-specifications-section");
    const observer =
      section
        ? new MutationObserver(() => {
            syncSpecificationsFromRealForm();
          })
        : null;

    if (section && observer) {
      observer.observe(section, { childList: true, subtree: true });
    }

    let cleanupInputListeners = wireSpecificationInputs();

    const rebindingObserver =
      section
        ? new MutationObserver(() => {
            cleanupInputListeners?.();
            cleanupInputListeners = wireSpecificationInputs();
          })
        : null;

    if (section && rebindingObserver) {
      rebindingObserver.observe(section, { childList: true, subtree: true });
    }

    return () => {
      realAddButton?.removeEventListener("click", syncSpecificationsFromRealForm);
      cleanupInputListeners?.();
      observer?.disconnect();
      rebindingObserver?.disconnect();
    };
  }, []);

  return (
    <section className="space-y-6">
      <div className="space-y-6">
        <SectionCard title="Products Description">
          <div className="space-y-6">
            <div>
              <label htmlFor="preview-product-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                id="preview-product-name"
                value={productName}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setProductName(nextValue);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("prelize:set-product-name", {
                        detail: { name: nextValue },
                      }),
                    );
                  }
                  const realInput = document.getElementById("product-name") as HTMLInputElement | null;
                  if (realInput) {
                    realInput.value = nextValue;
                    realInput.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                }}
                placeholder="Enter product name"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <label htmlFor="preview-brand" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Brand
                </label>
                <StyledSelect
                  id="preview-brand"
                  value={brandValue}
                  placeholder="Select Brand"
                  options={brandOptions}
                  onChange={(nextValue) => {
                    setBrandValue(nextValue);
                    const realSelect = document.getElementById("product-brand") as HTMLSelectElement | null;
                    if (realSelect) {
                      realSelect.value = nextValue;
                      realSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="preview-category" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <StyledSelect
                  id="preview-category"
                  value={categoryValue}
                  placeholder="Select Category"
                  options={categoryOptions}
                  onChange={(nextValue) => {
                    setCategoryValue(nextValue);
                    const realSelect = document.getElementById("product-category") as HTMLSelectElement | null;
                    if (realSelect) {
                      realSelect.value = nextValue;
                      realSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="preview-vendor" className="mb-1.5 block text-sm font-medium text-gray-700">
                Vendor
              </label>
              <StyledSelect
                id="preview-vendor"
                value={vendorValue}
                placeholder="Select Vendor"
                options={vendorOptions}
                onChange={(nextValue) => {
                  setVendorValue(nextValue);
                  const realSelect = document.getElementById("product-vendor") as HTMLSelectElement | null;
                  if (realSelect) {
                    realSelect.value = nextValue;
                    realSelect.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                }}
              />
            </div>

            <div>
              <label htmlFor="preview-description" className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="preview-description"
                placeholder="Receipt Info (optional)"
                rows={8}
                className="min-h-[162px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
              />
            </div>
          </div>
        </SectionCard>

        <TailadminProductDataPreview />

        <div className="grid gap-6 xl:grid-cols-[max-content_minmax(0,1fr)] xl:items-start">
          <SectionCard title="Product image">
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setOpenMediaTarget("main-image")}
                className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 transition-colors hover:border-[#615FFF]/40"
                style={{ maxWidth: `${PRODUCT_MEDIA_TILE_SIZE}px` }}
              >
                {mainImage ? (
                  <div
                    role="img"
                    aria-label="Main product image preview"
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${mainImage}")` }}
                  />
                ) : (
                  "Product image preview"
                )}
              </button>
              <p className="text-sm text-gray-500">Click the image to edit or update</p>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("prelize:set-main-image", {
                      detail: { imageUrl: "" },
                    }),
                  )
                }
                className="text-sm font-medium text-rose-500 hover:text-rose-600"
              >
                Remove product image
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Product gallery">
            <div className="space-y-5">
              {galleryImages.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center text-sm text-gray-400">
                  No product gallery images selected yet.
                </div>
              ) : (
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(auto-fill, minmax(${PRODUCT_MEDIA_TILE_SIZE}px, ${PRODUCT_MEDIA_TILE_SIZE}px))`,
                  }}
                >
                  {galleryImages.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      draggable
                      onDragStart={() => setDraggedGalleryIndex(index)}
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={() => {
                        if (draggedGalleryIndex === null || draggedGalleryIndex === index) {
                          setDraggedGalleryIndex(null);
                          return;
                        }

                        const nextImages = [...galleryImages];
                        const [draggedImage] = nextImages.splice(draggedGalleryIndex, 1);

                        nextImages.splice(index, 0, draggedImage);
                        setGalleryImages(nextImages);
                        syncGalleryImageOrder(nextImages);
                        setDraggedGalleryIndex(null);
                      }}
                      onDragEnd={() => setDraggedGalleryIndex(null)}
                      className={`group relative overflow-hidden rounded-xl border bg-gray-50 ${
                        draggedGalleryIndex === index ? "border-[#615FFF] opacity-70" : "border-gray-200"
                      }`}
                    >
                      <div
                        role="img"
                        aria-label={`Preview gallery image ${index + 1}`}
                        className="aspect-square bg-cover bg-center"
                        style={{ backgroundImage: `url("${imageUrl}")` }}
                      />
                      <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
                        Drag
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("prelize:remove-gallery-image", {
                              detail: { imageUrl },
                            }),
                          );
                        }}
                        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-50"
                        aria-label={`Delete gallery image ${index + 1}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M5.25 3.5H8.75M3.5 4.66667H10.5M4.375 4.66667L4.66667 9.91667C4.709 10.6788 5.3394 11.2778 6.10215 11.2778H7.89785C8.6606 11.2778 9.291 10.6788 9.33333 9.91667L9.625 4.66667" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M5.8335 6.4165V9.0415M8.1665 6.4165V9.0415" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M5.25 3.5L5.54167 2.91667C5.73974 2.52053 6.14457 2.27083 6.5875 2.27083H7.4125C7.85543 2.27083 8.26026 2.52053 8.45833 2.91667L8.75 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                  onClick={() => setOpenMediaTarget("gallery")}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#615FFF] hover:opacity-80"
                >
                Add product gallery images
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <p className="text-xs text-slate-500">
                Add button opens a floating media library connected to the real database, and hover delete removes the real saved gallery image.
              </p>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Specifications">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Product specification rows</p>
                <p className="mt-1 text-sm text-gray-500">Add structured label and value pairs in TailAdmin style.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  syncSpecificationsState(specifications);
                  const realAddButton = document.getElementById("product-specifications-add") as HTMLButtonElement | null;
                  realAddButton?.click();
                }}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Add Spec
              </button>
            </div>

            {specifications.map((specification, index) => (
                <div key={specification.id} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-800">Specification {index + 1}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_56px] md:items-end">
                    <div className="min-w-0">
                      <label htmlFor={`preview-spec-label-${specification.id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                        Label
                      </label>
                      <input
                        id={`preview-spec-label-${specification.id}`}
                        value={specification.label}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          const nextSpecifications = specifications.map((item) =>
                            item.id === specification.id ? { ...item, label: nextValue } : item,
                          );

                          setSpecifications(nextSpecifications);
                          syncSpecificationsState(nextSpecifications);
                          syncFieldValue(`product-spec-label-${specification.id}`, nextValue);
                        }}
                        placeholder="Material, Origin, Packaging"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
                      />
                    </div>

                    <div className="min-w-0">
                      <label htmlFor={`preview-spec-value-${specification.id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                        Value
                      </label>
                      <input
                        id={`preview-spec-value-${specification.id}`}
                        value={specification.value}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          const nextSpecifications = specifications.map((item) =>
                            item.id === specification.id ? { ...item, value: nextValue } : item,
                          );

                          setSpecifications(nextSpecifications);
                          syncSpecificationsState(nextSpecifications);
                          syncFieldValue(`product-spec-value-${specification.id}`, nextValue);
                        }}
                        placeholder="Cotton, China, 12 pcs per carton"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none focus:ring-4 focus:ring-[#615FFF]/10"
                      />
                    </div>

                    {index === 0 ? (
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-300">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                          <path d="M7.125 3.375H10.875M4.875 5.625H13.125M6 5.625L6.375 12.375C6.42939 13.3549 7.2399 14.125 8.22134 14.125H9.77866C10.7601 14.125 11.5706 13.3549 11.625 12.375L12 5.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          syncSpecificationsState(specifications);
                          const realRemoveButton = document.querySelector<HTMLButtonElement>(
                            `[data-product-spec-remove-id='${specification.id}']`,
                          );
                          realRemoveButton?.click();
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-rose-500 shadow-sm hover:bg-rose-50"
                        aria-label={`Remove specification ${index + 1}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                          <path d="M7.125 3.375H10.875M4.875 5.625H13.125M6 5.625L6.375 12.375C6.42939 13.3549 7.2399 14.125 8.22134 14.125H9.77866C10.7601 14.125 11.5706 13.3549 11.625 12.375L12 5.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => submitRealProductForm("draft")}
            disabled={isSubmittingProduct}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingSubmitStatus === "draft" ? "Saving..." : "Draft"}
          </button>
          <button
            type="button"
            onClick={() => submitRealProductForm("active")}
            disabled={isSubmittingProduct}
            className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingSubmitStatus === "active" ? "Saving..." : "Publish Product"}
          </button>
        </div>
      </div>

      <GalleryLibraryModal
        isOpen={openMediaTarget !== null}
        target={openMediaTarget ?? "gallery"}
        currentMainImage={mainImage}
        vendorId={vendorValue}
        onClose={() => setOpenMediaTarget(null)}
        onConfirmSelection={(imageUrls) => {
          if (openMediaTarget === "main-image") {
            const imageUrl = imageUrls[0] ?? "";

            window.dispatchEvent(
              new CustomEvent("prelize:set-main-image", {
                detail: { imageUrl },
              }),
            );
          } else if (openMediaTarget?.startsWith("variation:")) {
            window.dispatchEvent(
              new CustomEvent("prelize:set-variation-image", {
                detail: {
                  variationId: openMediaTarget.replace("variation:", ""),
                  imageUrl: imageUrls[0] ?? "",
                },
              }),
            );
          } else {
            window.dispatchEvent(
              new CustomEvent("prelize:add-gallery-images", {
                detail: { images: imageUrls },
              }),
            );
          }

          setOpenMediaTarget(null);
        }}
      />
    </section>
  );
}
