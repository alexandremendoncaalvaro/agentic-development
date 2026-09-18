import { relative, resolve } from 'node:path';

/** Repository-relative, forward-slash path for reports and reproduction commands. */
export function repoPath(root, path) {
  return relative(root, resolve(root, path)).split('\\').join('/');
}

/** Forward-slash form of a recorded path, without a leading `./`. */
export function normalizePath(path) {
  return path.split('\\').join('/').replace(/^\.\//, '');
}

export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
