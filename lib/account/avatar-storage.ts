import { getPgDataClient } from "@/lib/browser-app-client";

export const CUSTOMER_AVATAR_BUCKET =
  process.env.NEXT_PUBLIC_CUSTOMER_AVATAR_BUCKET ?? "customer-avatars";

function getAvatarStorageClient() {
  return getPgDataClient().storage.from(CUSTOMER_AVATAR_BUCKET);
}

export async function uploadCustomerAvatar(userId: string, file: File) {
  const filePath = `${userId}/avatar`;
  const { error } = await getAvatarStorageClient().upload(filePath, file, {
    cacheControl: "0",
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return {
      data: null as string | null,
      error,
    };
  }

  const publicUrl = getAvatarStorageClient().getPublicUrl(filePath).data.publicUrl;

  return {
    data: `${publicUrl}?v=${Date.now()}`,
    error: null,
  };
}
