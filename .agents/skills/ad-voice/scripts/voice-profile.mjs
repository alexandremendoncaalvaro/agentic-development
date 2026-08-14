#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function absolute(path) {
  return isAbsolute(path) ? path : resolve(path);
}

export function resolveProfilePath({
  explicitPath,
  environmentPath = process.env.AGENTIC_VOICE_DIR,
  home = homedir(),
} = {}) {
  if (explicitPath) {
    return {
      source: 'explicit',
      profilePath: absolute(explicitPath),
    };
  }
  if (environmentPath) {
    return {
      source: 'environment',
      profilePath: join(absolute(environmentPath), 'profile.md'),
    };
  }
  return {
    source: 'default',
    profilePath: join(home, '.agentic', 'voice', 'profile.md'),
  };
}

export function parseProfileMarkdown(markdown) {
  const matches = [...markdown.matchAll(/```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g)];
  if (matches.length !== 1) {
    throw new Error('profile must contain exactly one fenced json data block');
  }
  if (
    !/^# Personal voice profile[ \t]*\r?\n\r?\n## Profile data[ \t]*\r?\n\r?\n```json[ \t]*\r?\n[\s\S]*?\r?\n```[ \t]*(?:\r?\n)?$/.test(markdown)
  ) {
    throw new Error('profile must contain only the canonical title and Profile data section');
  }
  try {
    return JSON.parse(matches[0][1]);
  } catch {
    throw new Error('profile data is not valid JSON');
  }
}

function rejectUnknownFields(value, allowed, prefix, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const field of Object.keys(value)) {
    if (!allowed.includes(field)) errors.push(`${prefix}.${field} is unsupported`);
  }
}

export function assertPathOutsideRepository(path, label = 'profile') {
  const resolvedPath = absolute(path);
  let cursor = existsSync(resolvedPath)
    ? dirname(realpathSync(resolvedPath))
    : dirname(resolvedPath);
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  cursor = realpathSync(cursor);
  while (true) {
    if (existsSync(join(cursor, '.git'))) {
      throw new Error(`${label} path must be outside a Git repository: ${cursor}`);
    }
    const parent = dirname(cursor);
    if (parent === cursor) return;
    cursor = parent;
  }
}

export function validateProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return ['profile must be an object'];
  }
  rejectUnknownFields(
    profile,
    [
      'schemaVersion',
      'owner',
      'status',
      'retention',
      'rawSamplesRetained',
      'patterns',
      'examples',
      'limitations',
    ],
    'profile',
    errors
  );
  if (profile.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (profile.owner !== 'self') errors.push('owner must be self');
  if (profile.status !== 'confirmed') errors.push('status must be confirmed');
  if (profile.retention !== 'derived-only') {
    errors.push('retention must be derived-only');
  }
  if (profile.rawSamplesRetained !== false) {
    errors.push('rawSamplesRetained must be false');
  }
  for (const field of ['patterns', 'examples', 'limitations']) {
    if (!Array.isArray(profile[field])) errors.push(`${field} must be an array`);
  }
  if (Array.isArray(profile.patterns)) {
    const patternIds = new Set();
    profile.patterns.forEach((pattern, index) => {
      rejectUnknownFields(
        pattern,
        ['id', 'layer', 'instruction', 'scope', 'provenance'],
        `patterns[${index}]`,
        errors
      );
      if (typeof pattern?.id !== 'string' || !pattern.id.trim()) {
        errors.push(`patterns[${index}].id must be a non-empty string`);
      } else if (patternIds.has(pattern.id)) {
        errors.push(`patterns[${index}].id must be unique`);
      } else {
        patternIds.add(pattern.id);
      }
      if (!['identity', 'accommodation', 'context'].includes(pattern?.layer)) {
        errors.push(`patterns[${index}].layer is unsupported`);
      }
      if (typeof pattern?.instruction !== 'string' || !pattern.instruction.trim()) {
        errors.push(`patterns[${index}].instruction must be a non-empty string`);
      }
      if (!Array.isArray(pattern?.scope?.languages) || !pattern.scope.languages.length) {
        errors.push(`patterns[${index}].scope.languages must be a non-empty array`);
      } else if (
        pattern.scope.languages.some(
          (language) => typeof language !== 'string' || !language.trim()
        )
      ) {
        errors.push(
          `patterns[${index}].scope.languages must contain only non-empty strings`
        );
      }
      const scopeDimensions = [
        'languages',
        'channels',
        'audiences',
        'relationships',
        'documentTypes',
        'topics',
        'tones',
      ];
      if (pattern?.scope && typeof pattern.scope === 'object') {
        for (const dimension of Object.keys(pattern.scope)) {
          if (!scopeDimensions.includes(dimension)) {
            errors.push(`patterns[${index}].scope.${dimension} is unsupported`);
          }
        }
      }
      for (const dimension of scopeDimensions.slice(1)) {
        const values = pattern?.scope?.[dimension];
        if (values !== undefined && (!Array.isArray(values) || !values.length)) {
          errors.push(
            `patterns[${index}].scope.${dimension} must be a non-empty array when present`
          );
        } else if (
          Array.isArray(values) &&
          values.some((value) => typeof value !== 'string' || !value.trim())
        ) {
          errors.push(
            `patterns[${index}].scope.${dimension} must contain only non-empty strings`
          );
        }
      }
      if (
        !['observed', 'explicit-preference', 'functional-equivalent', 'community-observed']
          .includes(pattern?.provenance?.basis)
      ) {
        errors.push(`patterns[${index}].provenance.basis is unsupported`);
      }
      rejectUnknownFields(
        pattern?.provenance,
        [
          'basis',
          'authorClass',
          'evidenceLanguages',
          'sourceSummary',
          'sourceCount',
          'confidence',
          'approved',
        ],
        `patterns[${index}].provenance`,
        errors
      );
      if (
        !Array.isArray(pattern?.provenance?.evidenceLanguages) ||
        !pattern.provenance.evidenceLanguages.length
      ) {
        errors.push(
          `patterns[${index}].provenance.evidenceLanguages must be a non-empty array`
        );
      } else if (
        pattern.provenance.evidenceLanguages.some(
          (language) => typeof language !== 'string' || !language.trim()
        )
      ) {
        errors.push(
          `patterns[${index}].provenance.evidenceLanguages must contain only non-empty strings`
        );
      }
      if (
        typeof pattern?.provenance?.sourceSummary !== 'string' ||
        !pattern.provenance.sourceSummary.trim()
      ) {
        errors.push(
          `patterns[${index}].provenance.sourceSummary must be a non-empty string`
        );
      }
      if (!Number.isInteger(pattern?.provenance?.sourceCount) || pattern.provenance.sourceCount < 1) {
        errors.push(
          `patterns[${index}].provenance.sourceCount must be a positive integer`
        );
      }
      if (!['low', 'medium', 'high'].includes(pattern?.provenance?.confidence)) {
        errors.push(`patterns[${index}].provenance.confidence is unsupported`);
      }
      if (pattern?.provenance?.approved !== true) {
        errors.push(`patterns[${index}].provenance.approved must be true`);
      }
      if (
        pattern?.layer === 'identity' &&
        pattern?.provenance?.authorClass !== 'owner'
      ) {
        errors.push(`patterns[${index}] identity provenance must use authorClass owner`);
      }
      if (
        pattern?.layer === 'accommodation' &&
        pattern?.provenance?.authorClass !== 'community'
      ) {
        errors.push(
          `patterns[${index}] accommodation provenance must use authorClass community`
        );
      }
      if (
        pattern?.layer === 'context' &&
        pattern?.provenance?.authorClass !== 'owner'
      ) {
        errors.push(`patterns[${index}] context provenance must use authorClass owner`);
      }
      if (
        pattern?.layer === 'accommodation' &&
        pattern?.provenance?.basis !== 'community-observed'
      ) {
        errors.push(
          `patterns[${index}] accommodation provenance must use basis community-observed`
        );
      }
      if (
        pattern?.layer !== 'accommodation' &&
        pattern?.provenance?.basis === 'community-observed'
      ) {
        errors.push(
          `patterns[${index}] ${pattern.layer} provenance cannot use basis community-observed`
        );
      }
      const appliedLanguages = pattern?.scope?.languages;
      const evidenceLanguages = pattern?.provenance?.evidenceLanguages;
      if (
        pattern?.layer === 'accommodation' &&
        Array.isArray(appliedLanguages) &&
        Array.isArray(evidenceLanguages) &&
        appliedLanguages.some((language) => !evidenceLanguages.includes(language))
      ) {
        errors.push(
          `patterns[${index}] accommodation evidence must cover every target language`
        );
      }
      if (
        pattern?.layer !== 'accommodation' &&
        Array.isArray(appliedLanguages) &&
        Array.isArray(evidenceLanguages) &&
        appliedLanguages.some((language) => !evidenceLanguages.includes(language)) &&
        pattern?.provenance?.basis !== 'functional-equivalent'
      ) {
        errors.push(
          `patterns[${index}] applies beyond its evidence languages without functional-equivalent provenance`
        );
      }
    });
  }
  if (Array.isArray(profile.examples)) {
    const exampleIds = new Set();
    profile.examples.forEach((example, index) => {
      rejectUnknownFields(
        example,
        ['id', 'text', 'language', 'authorClass', 'approved', 'retentionApproved'],
        `examples[${index}]`,
        errors
      );
      if (typeof example?.id !== 'string' || !example.id.trim()) {
        errors.push(`examples[${index}].id must be a non-empty string`);
      } else if (exampleIds.has(example.id)) {
        errors.push(`examples[${index}].id must be unique`);
      } else {
        exampleIds.add(example.id);
      }
      if (typeof example?.text !== 'string' || !example.text.trim()) {
        errors.push(`examples[${index}].text must be a non-empty string`);
      } else if ([...example.text].length > 280) {
        errors.push(`examples[${index}].text must be at most 280 characters`);
      }
      if (typeof example?.language !== 'string' || !example.language.trim()) {
        errors.push(`examples[${index}].language must be a non-empty string`);
      }
      if (example?.authorClass !== 'owner') {
        errors.push(`examples[${index}].authorClass must be owner`);
      }
      if (example?.approved !== true) {
        errors.push(`examples[${index}].approved must be true`);
      }
      if (example?.retentionApproved !== true) {
        errors.push(`examples[${index}].retentionApproved must be true`);
      }
    });
  }
  if (Array.isArray(profile.limitations)) {
    profile.limitations.forEach((limitation, index) => {
      if (typeof limitation !== 'string') {
        errors.push(`limitations[${index}] must be a string`);
      }
    });
  }
  return errors;
}

export function renderProfileMarkdown(profile) {
  return `# Personal voice profile\n\n## Profile data\n\n\`\`\`json\n${JSON.stringify(profile, null, 2)}\n\`\`\`\n`;
}

export function writeProfileAtomic(profilePath, profile) {
  assertPathOutsideRepository(profilePath);
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(`profile validation failed: ${errors.join('; ')}`);

  const directory = dirname(profilePath);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = join(
    directory,
    `.${basename(profilePath)}.tmp-${process.pid}-${Date.now()}`
  );
  try {
    writeFileSync(temporaryPath, renderProfileMarkdown(profile), {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temporaryPath, profilePath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  if (!args[index + 1]) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'resolve') {
    const resolved = resolveProfilePath({
      explicitPath: optionValue(args, '--profile'),
    });
    process.stdout.write(
      `${JSON.stringify({
        ...resolved,
        exists: existsSync(resolved.profilePath),
      }, null, 2)}\n`
    );
    return;
  }
  if (command === 'validate') {
    const resolved = resolveProfilePath({
      explicitPath: optionValue(args, '--profile'),
    });
    assertPathOutsideRepository(resolved.profilePath);
    const profile = parseProfileMarkdown(readFileSync(resolved.profilePath, 'utf8'));
    const errors = validateProfile(profile);
    process.stdout.write(
      `${JSON.stringify({
        valid: errors.length === 0,
        profilePath: resolved.profilePath,
        patterns: Array.isArray(profile.patterns) ? profile.patterns.length : 0,
        examples: Array.isArray(profile.examples) ? profile.examples.length : 0,
        errors,
      }, null, 2)}\n`
    );
    if (errors.length) process.exitCode = 1;
    return;
  }
  if (command === 'write') {
    const resolved = resolveProfilePath({
      explicitPath: optionValue(args, '--profile'),
    });
    assertPathOutsideRepository(resolved.profilePath);
    const inputPath = optionValue(args, '--input');
    if (!inputPath) throw new Error('write requires --input <json-path>');
    assertPathOutsideRepository(inputPath, 'candidate');
    let profile;
    try {
      profile = JSON.parse(readFileSync(absolute(inputPath), 'utf8'));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('candidate data is not valid JSON');
      throw error;
    }
    writeProfileAtomic(resolved.profilePath, profile);
    process.stdout.write(
      `${JSON.stringify({ written: true, profilePath: resolved.profilePath }, null, 2)}\n`
    );
    return;
  }
  throw new Error(
    'usage: voice-profile.mjs <resolve|validate|write> [--profile <path>] [--input <json-path>]'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
