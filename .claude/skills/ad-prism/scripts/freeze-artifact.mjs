#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function digestFile(path) {
  const payload = readFileSync(path);
  return {
    sha256: createHash('sha256').update(payload).digest('hex'),
    size_bytes: payload.length,
    files: 1,
    included_paths: [basename(path)],
    kind: 'file',
    receipt_sha256: null,
  };
}

function includedFiles(root, directory = root) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const relativePath = relative(root, path).split('\\').join('/');
    if (entry.isSymbolicLink()) {
      throw new Error(`Directory contains unsupported symlink: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      if (entry.name !== '__pycache__') files.push(...includedFiles(root, path));
      continue;
    }
    if (entry.isFile() && entry.name !== '.DS_Store' && !entry.name.endsWith('.pyc')) {
      files.push({ path, relativePath });
    }
  }

  return files.sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0
  );
}

function lengthPrefix(length) {
  const prefix = Buffer.alloc(8);
  prefix.writeBigUInt64BE(BigInt(length));
  return prefix;
}

function digestDirectory(root) {
  const hash = createHash('sha256');
  hash.update(Buffer.from('prism-directory-v2\0'));
  const files = includedFiles(root);
  let sizeBytes = 0;
  let receiptSha256 = null;

  for (const file of files) {
    const relativePath = Buffer.from(file.relativePath, 'utf8');
    let payload = readFileSync(file.path);
    sizeBytes += payload.length;

    if (file.relativePath === 'audit.md') {
      const text = payload.toString('utf8');
      const receipts = [...text.matchAll(/^(- SHA-256:[ \t]*)([^\r\n]*)$/gm)];
      if (receipts.length !== 1) {
        throw new Error("Root audit.md must contain exactly one '- SHA-256:' receipt line");
      }
      receiptSha256 = receipts[0][2]
        .trim()
        .replace(/^`([0-9a-f]{64})`$/i, '$1');
      payload = Buffer.from(text.replace(receipts[0][0], `${receipts[0][1]}<self>`), 'utf8');
    }

    hash.update(lengthPrefix(relativePath.length));
    hash.update(relativePath);
    hash.update(lengthPrefix(payload.length));
    hash.update(payload);
  }

  return {
    sha256: hash.digest('hex'),
    size_bytes: sizeBytes,
    files: files.length,
    included_paths: files.map((file) => file.relativePath),
    kind: 'directory',
    receipt_sha256: receiptSha256,
  };
}

export function freezeArtifact(path, expectedHash = null) {
  const resolvedPath = resolve(path);

  try {
    if (lstatSync(resolvedPath).isSymbolicLink()) {
      throw new Error('Artifact root cannot be a symlink');
    }
    const stats = statSync(resolvedPath);
    const digest = stats.isDirectory() ? digestDirectory(resolvedPath) : digestFile(resolvedPath);
    const expected = expectedHash?.toLocaleLowerCase('en-US') ?? null;
    if (expected !== null && !/^[0-9a-f]{64}$/.test(expected)) {
      return {
        path: resolvedPath,
        valid: false,
        ...digest,
        expected,
        match: false,
        error: 'Expected hash must contain 64 hexadecimal characters',
      };
    }
    let matches = expected === null ? null : digest.sha256 === expected;
    let error = null;
    if (
      expected !== null &&
      digest.receipt_sha256 !== null &&
      (!/^[0-9a-f]{64}$/i.test(digest.receipt_sha256) ||
        digest.receipt_sha256.toLocaleLowerCase('en-US') !== digest.sha256)
    ) {
      matches = false;
      error = 'Embedded audit receipt does not match the computed SHA-256';
    }
    const result = {
      path: resolvedPath,
      valid: matches !== false,
      ...digest,
      expected,
      match: matches,
    };
    if (error) result.error = error;
    return result;
  } catch (error) {
    return {
      path: resolvedPath,
      valid: false,
      error: `Unable to freeze artifact: ${error.message}`,
    };
  }
}

function main() {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write('Usage: freeze-artifact.mjs <artifact> [--expect <sha256>]\n');
    process.exitCode = 2;
    return;
  }

  const expectIndex = process.argv.indexOf('--expect');
  const expected = expectIndex === -1 ? null : process.argv[expectIndex + 1];
  if (expectIndex !== -1 && !expected) {
    process.stderr.write('Usage: freeze-artifact.mjs <artifact> [--expect <sha256>]\n');
    process.exitCode = 2;
    return;
  }

  const result = freezeArtifact(path, expected);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
