import { getSupabaseClient } from "@/lib/supabase-client";

export const PRODUCT_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_MEDIA_BUCKET ?? "product-media";
export const PRODUCT_MEDIA_FOLDER = "products";
export const VENDOR_MEDIA_FOLDER = "vendors";

export type ProductMediaItem = {
  name: string;
  path: string;
  publicUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function getStorageClient() {
  return getSupabaseClient().storage.from(PRODUCT_MEDIA_BUCKET);
}

function getVendorMediaPrefix(vendorId: string) {
  return `vendor-${vendorId}-`;
}

function getVendorOnboardingFolder(userId: string) {
  return `${VENDOR_MEDIA_FOLDER}/onboarding-user-${userId}`;
}

export function getProductMediaPublicUrl(path: string) {
  return getStorageClient().getPublicUrl(path).data.publicUrl;
}

export async function listProductMedia(options?: { vendorId?: string | null }) {
  const { data, error } = await getStorageClient().list(PRODUCT_MEDIA_FOLDER, {
    limit: 200,
    sortBy: { column: "name", order: "desc" },
  });

  if (error) {
    return {
      data: [] as ProductMediaItem[],
      error,
    };
  }

  return {
    data: (data ?? [])
      .filter((file) => file.name)
      .filter((file) => {
        if (!options?.vendorId) {
          return true;
        }

        return file.name.startsWith(getVendorMediaPrefix(options.vendorId));
      })
      .map((file) => {
        const path = `${PRODUCT_MEDIA_FOLDER}/${file.name}`;

        return {
          name: file.name,
          path,
          publicUrl: getProductMediaPublicUrl(path),
          createdAt: file.created_at ?? null,
          updatedAt: file.updated_at ?? null,
        };
      }),
    error: null,
  };
}

export async function uploadProductMedia(file: File, options?: { vendorId?: string | null }) {
  const safeFileName = file.name.replace(/\s+/g, "-").toLowerCase();
  const scopedFileName = options?.vendorId
    ? `${getVendorMediaPrefix(options.vendorId)}${Date.now()}-${safeFileName}`
    : `${Date.now()}-${safeFileName}`;
  const filePath = `${PRODUCT_MEDIA_FOLDER}/${scopedFileName}`;
  const { error } = await getStorageClient().upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return {
      data: null as ProductMediaItem | null,
      error,
    };
  }

  return {
    data: {
      name: filePath.split("/").pop() ?? safeFileName,
      path: filePath,
      publicUrl: getProductMediaPublicUrl(filePath),
      createdAt: null,
      updatedAt: null,
    },
    error: null,
  };
}

export async function uploadVendorOnboardingMedia(
  file: File,
  options: { userId: string; field: "logo" | "banner" },
) {
  const safeFileName = file.name.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${getVendorOnboardingFolder(options.userId)}/${options.field}-${Date.now()}-${safeFileName}`;
  const { error } = await getStorageClient().upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return {
      data: null as ProductMediaItem | null,
      error,
    };
  }

  return {
    data: {
      name: filePath.split("/").pop() ?? safeFileName,
      path: filePath,
      publicUrl: getProductMediaPublicUrl(filePath),
      createdAt: null,
      updatedAt: null,
    },
    error: null,
  };
}

export async function removeProductMedia(path: string) {
  const { error } = await getStorageClient().remove([path]);

  return {
    error,
  };
}
