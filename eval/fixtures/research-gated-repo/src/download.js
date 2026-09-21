import { writeFileSync } from 'node:fs';

// Fetches the install archive once. A failed download is reported to the
// caller and not retried.
export async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed: ${response.status}`);
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}
