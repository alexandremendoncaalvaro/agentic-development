#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withoutFencedBlocks } from './markdown.mjs';

const REQUIRED_SECTIONS = [
  'Decision',
  'Objective',
  'Evaluation question',
  'Claim',
  'Evidence',
  'Tasks',
  'Measures',
  'Data sources',
  'Decision rule',
  'Limits',
  'Sources',
];
const TEXT_PLACEHOLDER = /(?:\bTODO\b|\bTBD\b|\[\s*(?:fill|todo|tbd)[^\]]*\])/i;
const ANGLE_PLACEHOLDER_WORDS = new Set([
  'claim',
  'decision',
  'detail',
  'evidence',
  'evaluation',
  'finding',
  'gate',
  'hash',
  'limit',
  'measure',
  'objective',
  'path',
  'question',
  'rule',
  'source',
  'task',
  'verdict',
]);

function hasPlaceholder(line) {
  if (TEXT_PLACEHOLDER.test(line)) return true;

  for (const match of line.matchAll(/<([^>\n]+)>/g)) {
    const content = match[1].trim();
    if (/^(?:https?:\/\/|mailto:)[^\s<>]+$/i.test(content)) continue;
    const firstWord = content.split(/\s+/, 1)[0].replace(/[.,:;?!]+$/, '').toLocaleLowerCase('en-US');
    if (ANGLE_PLACEHOLDER_WORDS.has(firstWord)) return true;
  }

  return false;
}

function parseSections(text) {
  const matches = [...text.matchAll(/^##\s+(.+?)\s*$/gm)];
  const sections = new Map();
  const labels = new Map();
  const counts = new Map();

  for (const [index, match] of matches.entries()) {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const label = match[1].trim();
    const key = label.toLocaleLowerCase('en-US');
    labels.set(key, labels.get(key) ?? label);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    sections.set(key, text.slice(start, end).trim());
  }

  return {
    sections,
    duplicates: [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key]) => labels.get(key))
      .sort(),
  };
}

export function validatePlan(path) {
  const resolvedPath = resolve(path);
  let text;

  try {
    text = readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    return {
      path: resolvedPath,
      valid: false,
      errors: [`Unable to read plan: ${error.message}`],
      warnings: [],
      missing_sections: [...REQUIRED_SECTIONS],
      duplicate_sections: [],
      present_sections: [],
    };
  }

  const structuralText = withoutFencedBlocks(text);
  const { sections, duplicates } = parseSections(structuralText);
  const errors = duplicates.map((section) => `Duplicate section: ${section}`);
  const missing = [];

  for (const section of REQUIRED_SECTIONS) {
    const key = section.toLocaleLowerCase('en-US');
    if (!sections.has(key)) {
      missing.push(section);
      errors.push(`Missing required section: ${section}`);
    } else if (!sections.get(key)) {
      errors.push(`Required section is empty: ${section}`);
    }
  }

  for (const [index, line] of structuralText.split(/\r?\n/).entries()) {
    if (hasPlaceholder(line)) {
      errors.push(`Unresolved placeholder at line ${index + 1}`);
    }
  }

  return {
    path: resolvedPath,
    valid: errors.length === 0,
    errors,
    warnings: /^#\s+\S/m.test(structuralText) ? [] : ['Plan has no level-one title'],
    missing_sections: missing,
    duplicate_sections: duplicates,
    present_sections: REQUIRED_SECTIONS.filter((section) =>
      sections.has(section.toLocaleLowerCase('en-US'))
    ),
  };
}

function main() {
  const path = process.argv[2];
  if (!path) {
    process.stderr.write('Usage: validate-plan.mjs <evaluation-plan.md>\n');
    process.exitCode = 2;
    return;
  }

  const result = validatePlan(path);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
