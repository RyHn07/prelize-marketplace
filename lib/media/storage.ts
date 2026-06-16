import { getPgDataClient } from "@/lib/browser-app-client";

export const PRODUCT_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_PRODUCT_MEDIA_BUCKET ?? "product-media";
export const PRODUCT_MEDIA_FOLDER = "products";
export const VENDOR_MEDIA_FOLDER = "vendors";

export type ProductMediaItem = {
  name: string;
  path: string;
  publicUrl: string;
  altText: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ProductMediaMetadataRow = {
  path: string;
  alt_text: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getStorageClient() {
  return getPgDataClient().storage.from(PRODUCT_MEDIA_BUCKET);
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

function isMissingRelationError(message: string | undefined) {
  if (!message) {
    return false;
  }

  return message.includes("product_media_metadata") && message.toLowerCase().includes("does not exist");
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

  const files =
    (data ?? [])
      .filter((file) => file.name)
      .filter((file) => {
        if (!options?.vendorId) {
          return true;
        }

        return file.name.startsWith(getVendorMediaPrefix(options.vendorId));
      }) ?? [];

  const paths = files.map((file) => `${PRODUCT_MEDIA_FOLDER}/${file.name}`);
  const metadataMap = new Map<string, ProductMediaMetadataRow>();

  if (paths.length > 0) {
    const metadataResult = await getPgDataClient()
      .from("product_media_metadata")
      .select("path, alt_text, created_at, updated_at")
      .in("path", paths);

    if (!metadataResult.error) {
      (metadataResult.data as ProductMediaMetadataRow[] | null)?.forEach((row) => {
        metadataMap.set(row.path, row);
      });
    } else if (!isMissingRelationError(metadataResult.error.message)) {
      return {
        data: [] as ProductMediaItem[],
        error: metadataResult.error,
      };
    }
  }

  return {
    data: files.map((file) => {
        const path = `${PRODUCT_MEDIA_FOLDER}/${file.name}`;
        const metadata = metadataMap.get(path);

        return {
          name: file.name,
          path,
          publicUrl: getProductMediaPublicUrl(path),
          altText: metadata?.alt_text ?? null,
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
      altText: null,
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
      altText: null,
      createdAt: null,
      updatedAt: null,
    },
    error: null,
  };
}

export async function upsertProductMediaAltText(path: string, altText: string | null) {
  const normalizedAltText = altText?.trim() ? altText.trim() : null;
  const dataClient = getPgDataClient() as unknown as {
    from: (table: string) => {
      upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };

  const { data, error } = await dataClient
    .from("product_media_metadata")
    .upsert(
      {
        path,
        alt_text: normalizedAltText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "path" },
    )
    .select("path, alt_text, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return {
      data: null as ProductMediaMetadataRow | null,
      error,
    };
  }

  return {
    data: (data as ProductMediaMetadataRow | null) ?? null,
    error: null,
  };
}

export async function removeProductMedia(path: string) {
  const { error } = await getStorageClient().remove([path]);

  if (!error) {
    const metadataDeleteResult = await getPgDataClient()
      .from("product_media_metadata")
      .delete()
      .eq("path", path);

    if (metadataDeleteResult.error && !isMissingRelationError(metadataDeleteResult.error.message)) {
      return {
        error: metadataDeleteResult.error,
      };
    }
  }

  return {
    error,
  };
}
