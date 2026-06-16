import { getPgDataClient } from "@/lib/browser-app-client";

export const PAYMENT_PROOF_BUCKET =
  process.env.NEXT_PUBLIC_PAYMENT_PROOF_BUCKET ?? "payment-proofs";

function getPaymentProofStorageClient() {
  return getPgDataClient().storage.from(PAYMENT_PROOF_BUCKET);
}

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "payment-proof";
}

export async function uploadOrderPaymentProof(userId: string, orderId: string, file: File) {
  const filePath = `${userId}/${orderId}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await getPaymentProofStorageClient().upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return {
      data: null as string | null,
      error,
    };
  }

  return {
    data: filePath,
    error: null,
  };
}

export async function getOrderPaymentProofSignedUrl(filePath: string) {
  const { data, error } = await getPaymentProofStorageClient().createSignedUrl(filePath, 60 * 30);

  if (error) {
    return {
      data: null as string | null,
      error,
    };
  }

  return {
    data: data.signedUrl,
    error: null,
  };
}
