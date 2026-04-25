import { getSupabaseClient } from "@/lib/supabase-client";

export const PRODUCT_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PRODUCT_MEDIA_BUCKET ?? "product-media";
export const PRODUCT_MEDIA_FOLDER = "products";

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

export function getProductMediaPublicUrl(path: string) {
  return getStorageClient().getPublicUrl(path).data.publicUrl;
}

export async function listProductMedia() {
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

export async function uploadProductMedia(file: File) {
  const safeFileName = file.name.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${PRODUCT_MEDIA_FOLDER}/${Date.now()}-${safeFileName}`;
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
