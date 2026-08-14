import { homedir } from 'node:os';

export const SCOPES = ['user', 'project'];

export function resolveScope(scope) {
  const resolved = scope ?? 'user';
  if (!SCOPES.includes(resolved)) {
    throw new Error(`invalid scope "${resolved}". Use one of: ${SCOPES.join(', ')}`);
  }
  return resolved;
}

export function targetForScope(scope, cwd, home = homedir()) {
  return scope === 'user' ? home : cwd;
}
