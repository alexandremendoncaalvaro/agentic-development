#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withoutFencedBlocks } from './markdown.mjs';

const INSTRUCTION_HEADINGS = new Set([
  'answer first',
  'bluf',
  'bottom line up front',
  'conclusion first',
  'useful answer first',
]);
const IMAGE = /!\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+['"][^'"]*['"])?\)/g;

function normalizedHeading(value) {
  return value
    .replace(/[*_`]+/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validateReport(path) {
  const resolvedPath = resolve(path);

  try {
    if (!statSync(resolvedPath).isFile()) {
      throw new Error('path is not a file');
    }
    const text = readFileSync(resolvedPath, 'utf8');
    const visibleText = withoutFencedBlocks(text);
    const headings = [...visibleText.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)];

    const errors = headings
      .map((match) => match[1])
      .filter((heading) => INSTRUCTION_HEADINGS.has(normalizedHeading(heading)))
      .map((heading) => `Visible heading exposes an editorial instruction: ${JSON.stringify(heading)}`);
    const warnings = [];
    let localImages = 0;
    let remoteImages = 0;

    for (const match of visibleText.matchAll(IMAGE)) {
      const target = decodeURIComponent((match[1] || match[2]).trim());
      if (/^(?:https?:|data:)/i.test(target)) {
        remoteImages += 1;
        warnings.push(`Remote image is not packaged with the report: ${target}`);
        continue;
      }

      localImages += 1;
      const pathPart = target.split(/[?#]/, 1)[0];
      const root = dirname(resolvedPath);
      const candidate = resolve(root, pathPart);
      const fromRoot = relative(root, candidate);
      if (
        isAbsolute(pathPart) ||
        pathPart.startsWith('\\') ||
        /^[A-Za-z]:[\\/]/.test(pathPart) ||
        fromRoot === '..' ||
        fromRoot.startsWith(`..${sep}`) ||
        isAbsolute(fromRoot)
      ) {
        errors.push(`Local image escapes the report directory: ${target}`);
        continue;
      }
      try {
        if (!statSync(candidate).isFile()) {
          errors.push(`Local image does not exist beside the report package: ${target}`);
        }
      } catch {
        errors.push(`Local image does not exist beside the report package: ${target}`);
      }
    }

    return {
      errors,
      path: resolvedPath,
      summary: {
        headings: headings.length,
        local_images: localImages,
        remote_images: remoteImages,
      },
      valid: errors.length === 0,
      warnings,
    };
  } catch (error) {
    return {
      errors: [`Unable to read report: ${error.message}`],
      path: resolvedPath,
      summary: { headings: 0, local_images: 0, remote_images: 0 },
      valid: false,
      warnings: [],
    };
  }
}

function main() {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write('Usage: validate-report.mjs <report.md>\n');
    process.exitCode = 2;
    return;
  }

  const result = validateReport(path);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
