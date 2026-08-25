#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AUTHOR_CLASSES = ['owner', 'community', 'external', 'official'];
const TEMPLATE_FIELDS = [
  'schemaVersion',
  'id',
  'artifactClass',
  'artifactType',
  'destinations',
  'audiences',
  'purpose',
  'useWhen',
  'avoidWhen',
  'requiredInformation',
  'optionalInformation',
  'orderingRules',
  'provenance',
  'strengths',
  'tradeOffs',
  'approval',
  'version',
  'limitations',
  'retainedExcerpts',
  'instructions',
];

function absolute(path) {
  return isAbsolute(path) ? path : resolve(path);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function rejectUnknownFields(value, allowed, prefix, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const field of Object.keys(value)) {
    if (!allowed.includes(field)) errors.push(`${prefix} contains an unsupported field`);
  }
}

function validateString(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function validateStringArray(
  value,
  label,
  errors,
  { allowEmpty = true, singleLine = false } = {}
) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  if (!allowEmpty && value.length === 0) {
    errors.push(`${label} must be a non-empty array`);
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) {
      errors.push(`${label}[${index}] must be a non-empty string`);
    } else if (singleLine && /[\r\n]/.test(item)) {
      errors.push(`${label}[${index}] must stay on one line`);
    }
  });
}

export function validateTemplate(template) {
  const errors = [];
  if (!template || typeof template !== 'object' || Array.isArray(template)) {
    return ['template must be an object'];
  }

  rejectUnknownFields(template, TEMPLATE_FIELDS, 'template', errors);
  if (template.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (typeof template.id !== 'string' || !TEMPLATE_ID.test(template.id)) {
    errors.push('id must be a kebab-case path-safe identifier');
  }
  if (!['publication', 'report'].includes(template.artifactClass)) {
    errors.push('artifactClass must be publication or report');
  }
  if (typeof template.artifactType !== 'string' || !TEMPLATE_ID.test(template.artifactType)) {
    errors.push('artifactType must be a kebab-case identifier');
  }

  validateStringArray(template.destinations, 'destinations', errors, { allowEmpty: false });
  validateStringArray(template.audiences, 'audiences', errors, { allowEmpty: false });
  validateString(template.purpose, 'purpose', errors);
  validateStringArray(template.useWhen, 'useWhen', errors, { allowEmpty: false });
  validateStringArray(template.avoidWhen, 'avoidWhen', errors);
  validateStringArray(template.requiredInformation, 'requiredInformation', errors, {
    allowEmpty: false,
  });
  validateStringArray(template.optionalInformation, 'optionalInformation', errors);
  validateStringArray(template.orderingRules, 'orderingRules', errors, { allowEmpty: false });
  validateStringArray(template.tradeOffs, 'tradeOffs', errors);
  validateStringArray(template.limitations, 'limitations', errors);
  validateStringArray(template.instructions, 'instructions', errors, {
    allowEmpty: false,
    singleLine: true,
  });

  const knownLocators = new Map();
  if (!template.provenance || typeof template.provenance !== 'object' || Array.isArray(template.provenance)) {
    errors.push('provenance must be an object');
  } else {
    rejectUnknownFields(
      template.provenance,
      ['derivedOnly', 'rawSourcesRetained', 'authorGroups'],
      'provenance',
      errors
    );
    if (template.provenance.derivedOnly !== true) {
      errors.push('provenance.derivedOnly must be true');
    }
    if (template.provenance.rawSourcesRetained !== false) {
      errors.push('provenance.rawSourcesRetained must be false');
    }
    if (!Array.isArray(template.provenance.authorGroups)) {
      errors.push('provenance.authorGroups must be an array');
    } else if (template.provenance.authorGroups.length === 0) {
      errors.push('provenance.authorGroups must be a non-empty array');
    } else {
      const seenClasses = new Set();
      template.provenance.authorGroups.forEach((group, groupIndex) => {
        rejectUnknownFields(
          group,
          ['authorClass', 'sources'],
          `provenance.authorGroups[${groupIndex}]`,
          errors
        );
        if (!AUTHOR_CLASSES.includes(group?.authorClass)) {
          errors.push(`provenance.authorGroups[${groupIndex}].authorClass is unsupported`);
        } else if (seenClasses.has(group.authorClass)) {
          errors.push(`provenance authorClass ${group.authorClass} must use one group`);
        } else {
          seenClasses.add(group.authorClass);
        }
        if (!Array.isArray(group?.sources) || group.sources.length === 0) {
          errors.push(
            `provenance.authorGroups[${groupIndex}].sources must be a non-empty array`
          );
          return;
        }
        group.sources.forEach((source, sourceIndex) => {
          const prefix = `provenance.authorGroups[${groupIndex}].sources[${sourceIndex}]`;
          rejectUnknownFields(source, ['locator', 'summary', 'approved'], prefix, errors);
          validateString(source?.locator, `${prefix}.locator`, errors);
          validateString(source?.summary, `${prefix}.summary`, errors);
          if (source?.approved !== true) errors.push(`${prefix}.approved must be true`);
          if (typeof source?.locator === 'string' && source.locator.trim()) {
            const priorClass = knownLocators.get(source.locator);
            if (priorClass && priorClass !== group.authorClass) {
              errors.push('source locator cannot appear under multiple author classes');
            } else if (priorClass) {
              errors.push('source locator must be unique');
            } else {
              knownLocators.set(source.locator, group.authorClass);
            }
          }
        });
      });
    }
  }

  if (!Array.isArray(template.strengths)) {
    errors.push('strengths must be an array');
  } else if (template.strengths.length === 0) {
    errors.push('strengths must be a non-empty array');
  } else {
    const strengthIds = new Set();
    template.strengths.forEach((strength, index) => {
      const prefix = `strengths[${index}]`;
      rejectUnknownFields(
        strength,
        ['id', 'description', 'sourceLocators'],
        prefix,
        errors
      );
      if (typeof strength?.id !== 'string' || !TEMPLATE_ID.test(strength.id)) {
        errors.push(`${prefix}.id must be a kebab-case identifier`);
      } else if (strengthIds.has(strength.id)) {
        errors.push(`${prefix}.id must be unique`);
      } else {
        strengthIds.add(strength.id);
      }
      validateString(strength?.description, `${prefix}.description`, errors);
      validateStringArray(strength?.sourceLocators, `${prefix}.sourceLocators`, errors, {
        allowEmpty: false,
      });
      if (Array.isArray(strength?.sourceLocators)) {
        strength.sourceLocators.forEach((locator) => {
          if (typeof locator === 'string' && locator.trim() && !knownLocators.has(locator)) {
            errors.push(`${prefix}.sourceLocators references an unknown source`);
          }
        });
      }
    });
  }

  if (!template.approval || typeof template.approval !== 'object' || Array.isArray(template.approval)) {
    errors.push('approval must be an object');
  } else {
    rejectUnknownFields(template.approval, ['status', 'approvedBy'], 'approval', errors);
    if (template.approval.status !== 'approved') {
      errors.push('approval.status must be approved');
    }
    if (template.approval.approvedBy !== 'owner') {
      errors.push('approval.approvedBy must be owner');
    }
  }
  if (!Number.isInteger(template.version) || template.version < 1) {
    errors.push('version must be a positive integer');
  }

  if (!Array.isArray(template.retainedExcerpts)) {
    errors.push('retainedExcerpts must be an array');
  } else {
    template.retainedExcerpts.forEach((excerpt, index) => {
      const prefix = `retainedExcerpts[${index}]`;
      rejectUnknownFields(
        excerpt,
        ['text', 'sourceLocator', 'authorClass', 'retentionApproved'],
        prefix,
        errors
      );
      validateString(excerpt?.text, `${prefix}.text`, errors);
      if (typeof excerpt?.text === 'string' && [...excerpt.text].length > 280) {
        errors.push(`${prefix}.text must be at most 280 characters`);
      }
      validateString(excerpt?.sourceLocator, `${prefix}.sourceLocator`, errors);
      if (
        typeof excerpt?.sourceLocator === 'string' &&
        excerpt.sourceLocator.trim() &&
        !knownLocators.has(excerpt.sourceLocator)
      ) {
        errors.push(`${prefix}.sourceLocator references an unknown source`);
      }
      if (excerpt?.authorClass !== 'owner') {
        errors.push(`${prefix}.authorClass must be owner`);
      }
      if (excerpt?.retentionApproved !== true) {
        errors.push(`${prefix}.retentionApproved must be true`);
      }
    });
  }

  return errors;
}

export function renderTemplateMarkdown(template) {
  const errors = validateTemplate(template);
  if (errors.length) throw new Error(`template validation failed: ${errors.join('; ')}`);
  const { instructions, ...metadata } = template;
  return `# Artifact template: ${template.id}\n\n## Template data\n\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n\n## Instructions\n\n${instructions.map((instruction) => `- ${instruction}`).join('\n')}\n`;
}

export function parseTemplateMarkdown(markdown) {
  const jsonBlocks = [...markdown.matchAll(/```json[ \t]*\r?\n([\s\S]*?)\r?\n```/g)];
  if (jsonBlocks.length !== 1) {
    throw new Error('template must contain exactly one fenced json metadata block');
  }
  const match = markdown.match(
    /^# Artifact template: ([a-z0-9]+(?:-[a-z0-9]+)*)[ \t]*\r?\n\r?\n## Template data[ \t]*\r?\n\r?\n```json[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*\r?\n\r?\n## Instructions[ \t]*\r?\n\r?\n([\s\S]*?)(?:\r?\n)?$/
  );
  if (!match) throw new Error('template does not match the canonical Markdown shape');

  let metadata;
  try {
    metadata = JSON.parse(match[2]);
  } catch {
    throw new Error('template metadata is not valid JSON');
  }
  const instructionLines = match[3].split(/\r?\n/).filter((line) => line.length > 0);
  if (!instructionLines.length || instructionLines.some((line) => !line.startsWith('- '))) {
    throw new Error('template instructions must be a non-empty Markdown bullet list');
  }
  const template = {
    ...metadata,
    instructions: instructionLines.map((line) => line.slice(2)),
  };
  if (template.id !== match[1]) {
    throw new Error('template title id must match metadata id');
  }
  return template;
}

function directoryFiles(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) return [];
  return readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (lstatSync(path).isSymbolicLink()) {
        throw new Error(`template store cannot contain symbolic link ${path}`);
      }
      return entry.isDirectory() ? directoryFiles(path) : path.endsWith('.md') ? [path] : [];
    });
}

function runGit(cwd, args, { required = true } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status === 0) return result.stdout.trim();
  if (!required) return null;
  throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim() || 'unknown error'}`);
}

function gitRoot(cwd, { required = true } = {}) {
  const root = runGit(cwd, ['rev-parse', '--show-toplevel'], { required });
  return root ? absolute(root) : null;
}

function defaultMachineDir({ environmentPath, home = homedir() } = {}) {
  const configured = environmentPath ?? process.env.AGENTIC_TEMPLATES_DIR;
  return configured ? absolute(configured) : join(home, '.agentic', 'templates');
}

function readLayer(name, root) {
  const resolvedRoot = absolute(root);
  const templates = [];
  const byId = new Map();
  for (const path of directoryFiles(resolvedRoot)) {
    const markdown = readFileSync(path, 'utf8');
    let template;
    try {
      template = parseTemplateMarkdown(markdown);
    } catch (error) {
      throw new Error(`${name} template ${path} is invalid: ${error.message}`);
    }
    const errors = validateTemplate(template);
    if (errors.length) {
      throw new Error(`${name} template ${path} is invalid: ${errors.join('; ')}`);
    }
    if (byId.has(template.id)) {
      throw new Error(`duplicate template id ${template.id} in ${name}`);
    }
    const item = {
      id: template.id,
      artifactClass: template.artifactClass,
      artifactType: template.artifactType,
      version: template.version,
      path,
      digest: sha256(markdown),
    };
    byId.set(template.id, item);
    templates.push(item);
  }

  for (const item of templates) {
    const expected = join(item.artifactClass, `${item.id}.md`);
    if (relative(resolvedRoot, item.path) !== expected) {
      throw new Error(`${name} template ${item.path} must be stored as ${expected}`);
    }
  }
  templates.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  return { path: resolvedRoot, templates };
}

export function resolveTemplateCatalog({
  cwd = process.cwd(),
  bundledDir,
  machineDir,
  environmentPath,
  home,
} = {}) {
  const repositoryRoot = gitRoot(cwd, { required: false });
  const roots = {
    bundled: bundledDir ? absolute(bundledDir) : join(absolute(cwd), '.agentic-no-bundles'),
    machine: machineDir
      ? absolute(machineDir)
      : defaultMachineDir({ environmentPath, home }),
    project: repositoryRoot
      ? join(repositoryRoot, '.agentic', 'templates')
      : join(absolute(cwd), '.agentic-no-project-templates'),
  };
  const layers = {
    bundled: readLayer('bundled', roots.bundled),
    machine: readLayer('machine', roots.machine),
    project: readLayer('project', roots.project),
  };

  const resolvedTemplates = new Map();
  for (const layer of ['bundled', 'machine', 'project']) {
    for (const template of layers[layer].templates) {
      const prior = resolvedTemplates.get(template.id);
      resolvedTemplates.set(template.id, {
        ...template,
        selectedLayer: layer,
        shadowed: prior
          ? [
              {
                layer: prior.selectedLayer,
                path: prior.path,
                digest: prior.digest,
                version: prior.version,
              },
              ...prior.shadowed,
            ]
          : [],
      });
    }
  }
  const templates = [...resolvedTemplates.values()].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  );
  const conflicts = templates
    .filter((template) => template.shadowed.some(({ digest }) => digest !== template.digest))
    .map((template) => ({
      id: template.id,
      selectedLayer: template.selectedLayer,
      shadowedLayers: template.shadowed.map(({ layer }) => layer),
    }));
  return { repositoryRoot, layers, templates, conflicts };
}

function readCandidate(inputPath) {
  const raw = readFileSync(absolute(inputPath));
  let template;
  try {
    template = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new Error('candidate data is not valid JSON');
  }
  const errors = validateTemplate(template);
  if (errors.length) throw new Error(`template validation failed: ${errors.join('; ')}`);
  return { raw, template };
}

export function prepareCandidate(inputPath) {
  return prepareReadCandidate(readCandidate(inputPath));
}

function prepareReadCandidate({ raw, template }) {
  return {
    valid: true,
    templateId: template.id,
    candidateSha256: sha256(raw),
    errors: [],
  };
}

function assertOutsideGitRepository(path, label) {
  let cursor = dirname(realpathSync(absolute(path)));
  while (true) {
    if (existsSync(join(cursor, '.git'))) {
      throw new Error(`${label} path must be outside a Git repository: ${cursor}`);
    }
    const parent = dirname(cursor);
    if (parent === cursor) return;
    cursor = parent;
  }
}

function readApproval(approvalPath, prepared, target) {
  if (!approvalPath) throw new Error('write requires a recorded approval');
  let approval;
  try {
    approval = JSON.parse(readFileSync(absolute(approvalPath), 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('approval data is not valid JSON');
    throw error;
  }
  const allowed = [
    'schemaVersion',
    'templateId',
    'candidateSha256',
    'targetLayer',
    'visibility',
    'approved',
    'approvedBy',
  ];
  const errors = [];
  rejectUnknownFields(approval, allowed, 'approval', errors);
  if (approval?.schemaVersion !== 1) errors.push('approval.schemaVersion must be 1');
  if (!['machine', 'project'].includes(approval?.targetLayer)) {
    errors.push('approval.targetLayer must be machine or project');
  }
  if (!['machine-local', 'committed'].includes(approval?.visibility)) {
    errors.push('approval.visibility must be machine-local or committed');
  }
  if (approval?.approved !== true) errors.push('approval.approved must be true');
  if (approval?.approvedBy !== 'owner') errors.push('approval.approvedBy must be owner');
  if (errors.length) throw new Error(`approval validation failed: ${errors.join('; ')}`);
  if (
    approval.templateId !== prepared.templateId ||
    approval.candidateSha256 !== prepared.candidateSha256
  ) {
    throw new Error('approval does not match the exact candidate');
  }
  if (
    approval.targetLayer !== target.layer ||
    approval.visibility !== target.visibility
  ) {
    throw new Error('approval does not match the target layer and visibility');
  }
  return approval;
}

export function atomicWrite(
  path,
  content,
  mode,
  { replace = renameSync } = {}
) {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true });
  const temporaryPath = join(
    directory,
    `.${basename(path)}.tmp-${process.pid}-${Date.now()}`
  );
  try {
    writeFileSync(temporaryPath, content, { encoding: 'utf8', mode });
    replace(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

function updateProjectExclude(repositoryRoot, templatePath, visibility) {
  const gitPath = runGit(repositoryRoot, ['rev-parse', '--git-path', 'info/exclude']);
  const excludePath = isAbsolute(gitPath) ? gitPath : join(repositoryRoot, gitPath);
  const entry = `/${relative(repositoryRoot, templatePath).split(sep).join('/')}`;
  const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
  const lines = current.match(/[^\r\n]*(?:\r\n|\n|$)/g)?.filter(Boolean) ?? [];
  const content = (line) => line.replace(/\r?\n$/, '');
  let next;
  if (visibility === 'machine-local') {
    if (lines.some((line) => content(line) === entry)) return;
    const eol = current.includes('\r\n') ? '\r\n' : '\n';
    const separator = current && !current.endsWith('\n') ? eol : '';
    next = `${current}${separator}${entry}${eol}`;
  } else {
    next = lines.filter((line) => content(line) !== entry).join('');
    if (next === current) return;
  }
  atomicWrite(excludePath, next, 0o600);
}

export function writeTemplateAtomic({
  inputPath,
  approvalPath,
  layer,
  machineDir,
  environmentPath,
  home,
  cwd = process.cwd(),
  visibility = 'machine-local',
} = {}) {
  if (!inputPath) throw new Error('write requires --input <candidate.json>');
  assertOutsideGitRepository(inputPath, 'candidate');
  if (approvalPath) assertOutsideGitRepository(approvalPath, 'approval');
  if (!['machine', 'project'].includes(layer)) {
    throw new Error('write layer must be machine or project');
  }
  if (!['machine-local', 'committed'].includes(visibility)) {
    throw new Error('visibility must be machine-local or committed');
  }
  if (layer === 'machine' && visibility !== 'machine-local') {
    throw new Error('machine layer visibility must be machine-local');
  }

  const candidate = readCandidate(inputPath);
  const { template } = candidate;
  const prepared = prepareReadCandidate(candidate);
  readApproval(approvalPath, prepared, { layer, visibility });

  let root;
  let repositoryRoot = null;
  if (layer === 'machine') {
    root = machineDir
      ? absolute(machineDir)
      : defaultMachineDir({ environmentPath, home });
  } else {
    repositoryRoot = gitRoot(cwd);
    root = join(repositoryRoot, '.agentic', 'templates');
  }
  const templatePath = join(root, template.artifactClass, `${template.id}.md`);
  if (layer === 'project' && visibility === 'machine-local') {
    updateProjectExclude(repositoryRoot, templatePath, visibility);
  }
  atomicWrite(
    templatePath,
    renderTemplateMarkdown(template),
    layer === 'project' && visibility === 'committed' ? 0o644 : 0o600
  );
  if (layer === 'project' && visibility === 'committed') {
    updateProjectExclude(repositoryRoot, templatePath, visibility);
  }
  return {
    written: true,
    layer,
    visibility,
    templateId: template.id,
    templatePath,
    candidateSha256: prepared.candidateSha256,
  };
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
    const result = resolveTemplateCatalog({
      cwd: optionValue(args, '--cwd'),
      bundledDir: optionValue(args, '--bundled'),
      machineDir: optionValue(args, '--machine-dir'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === 'validate') {
    const templatePath = optionValue(args, '--template');
    if (!templatePath) throw new Error('validate requires --template <path>');
    const template = parseTemplateMarkdown(readFileSync(absolute(templatePath), 'utf8'));
    const errors = validateTemplate(template);
    process.stdout.write(
      `${JSON.stringify({ valid: errors.length === 0, templatePath: absolute(templatePath), errors }, null, 2)}\n`
    );
    if (errors.length) process.exitCode = 1;
    return;
  }
  if (command === 'prepare') {
    const inputPath = optionValue(args, '--input');
    if (!inputPath) throw new Error('prepare requires --input <candidate.json>');
    process.stdout.write(`${JSON.stringify(prepareCandidate(inputPath), null, 2)}\n`);
    return;
  }
  if (command === 'write') {
    const result = writeTemplateAtomic({
      inputPath: optionValue(args, '--input'),
      approvalPath: optionValue(args, '--approval'),
      layer: optionValue(args, '--layer'),
      machineDir: optionValue(args, '--machine-dir'),
      cwd: optionValue(args, '--cwd'),
      visibility: optionValue(args, '--visibility') ?? 'machine-local',
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error(
    'usage: template-store.mjs <resolve|validate|prepare|write> [options]'
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
