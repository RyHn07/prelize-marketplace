import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const outputDir = process.env.STORAGE_BACKUP_DIR ?? "storage-backup";
const requestedBuckets = process.env.STORAGE_BUCKETS
  ? process.env.STORAGE_BUCKETS.split(",").map((bucket) => bucket.trim()).filter(Boolean)
  : [];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function toLocalPath(bucketName, objectName) {
  const safeParts = objectName
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[<>:"\\|?*\u0000-\u001f]/g, "_"));

  return join(outputDir, bucketName, ...safeParts);
}

async function listObjects(bucketName, prefix = "") {
  const objects = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Unable to list ${bucketName}/${prefix}: ${error.message}`);
    }

    const entries = data ?? [];

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.id === null) {
        objects.push(...(await listObjects(bucketName, path)));
      } else {
        objects.push({
          bucket: bucketName,
          name: path,
          id: entry.id,
          updatedAt: entry.updated_at,
          createdAt: entry.created_at,
          lastAccessedAt: entry.last_accessed_at,
          metadata: entry.metadata,
        });
      }
    }

    if (entries.length < limit) {
      break;
    }

    offset += limit;
  }

  return objects;
}

async function downloadObject(object) {
  const localPath = toLocalPath(object.bucket, object.name);

  try {
    const existing = await stat(localPath);
    const expectedSize = Number(object.metadata?.size ?? 0);

    if (!expectedSize || existing.size === expectedSize) {
      return { localPath, skipped: true };
    }
  } catch {
    // Missing files are downloaded below.
  }

  const { data, error } = await supabase.storage.from(object.bucket).download(object.name);

  if (error) {
    throw new Error(`Unable to download ${object.bucket}/${object.name}: ${error.message}`);
  }

  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, Buffer.from(await data.arrayBuffer()));

  return { localPath, skipped: false };
}

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

if (bucketsError) {
  throw new Error(`Unable to list buckets: ${bucketsError.message}`);
}

const bucketNames = (buckets ?? [])
  .map((bucket) => bucket.name)
  .filter((bucketName) => requestedBuckets.length === 0 || requestedBuckets.includes(bucketName));

const manifest = {
  source: supabaseUrl,
  backedUpAt: new Date().toISOString(),
  buckets: [],
};

await mkdir(outputDir, { recursive: true });

for (const bucketName of bucketNames) {
  console.log(`Listing ${bucketName}...`);
  const objects = await listObjects(bucketName);
  const downloaded = [];
  let skippedCount = 0;

  for (const [index, object] of objects.entries()) {
    const { localPath, skipped } = await downloadObject(object);
    skippedCount += skipped ? 1 : 0;
    downloaded.push({ ...object, localPath });

    if ((index + 1) % 25 === 0 || index + 1 === objects.length) {
      console.log(`${bucketName}: ${index + 1}/${objects.length} processed`);
    }
  }

  manifest.buckets.push({
    name: bucketName,
    objectCount: downloaded.length,
    skippedCount,
    objects: downloaded,
  });
}

await writeFile(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`Storage backup complete: ${outputDir}`);
