/**
 * What the host says about itself (Spec 0007 R5, ADR-0082 decision 2): the
 * version its binary prints and the environment its stream reports. A frozen
 * input the harness types is a claim; one read from the binary or the stream
 * that produced the trials is a measurement, so nothing here defaults.
 */

function fail(message) {
  throw new Error(message);
}

/**
 * The version the running binary prints. A frozen input the operator types is a
 * claim; one read from the binary that produced the trials is a measurement, so
 * a probe that cannot answer aborts rather than defaulting (ADR-0082 decision 2).
 */
export function probeHostVersion({ runner, spawn }) {
  const [command] = runner;
  const result = spawn(command, ['--version'], { encoding: 'utf8' });
  if (!result || result.status !== 0) {
    fail(`live: ${command} --version exited ${result?.status ?? 'without a status'}`);
  }
  const version = String(result.stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!version) fail(`live: ${command} --version printed no version`);
  return version;
}

/**
 * What the host itself reported about the run. Spec 0007 R5 freezes the
 * available tools, the permissions, the model, and the context policy, and a
 * frozen input the harness types is a claim rather than a measurement
 * (ADR-0082 decision 2). So each field is read from the stream, and a field the
 * host never reported is `null` and named in `unmeasured` — a plausible literal
 * in its place is the failure this function exists to prevent. The first pilot
 * is why: a receipt would have claimed `bare` and no tools while the host had
 * twenty-nine tools and the operator's whole configuration loaded.
 */
export function observeEnvironment({ host, stream }) {
  const observed = { model: null, tools: null, permissions: null, context_policy: null };
  for (const line of String(stream).split(/\r?\n/)) {
    if (line.trim() === '') continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (host === 'claude-code') readClaudeCodeEnvironment(record, observed);
  }
  const unmeasured = Object.entries(observed)
    .filter(([, value]) => value === null)
    .map(([key]) => key)
    .sort();
  return { ...observed, unmeasured };
}

function readClaudeCodeEnvironment(record, observed) {
  if (record.type === 'system' && record.subtype === 'init') {
    if (Array.isArray(record.tools)) observed.tools = record.tools;
    if (typeof record.permissionMode === 'string') observed.permissions = record.permissionMode;
    // A host that also loaded the operator's own skills, subagents, or commands
    // is not running the bare context the case assumes, and saying so is the
    // difference between a receipt that can be trusted and one that cannot.
    const extras = ['slash_commands', 'agents', 'mcp_servers'].filter(
      (key) => Array.isArray(record[key]) && record[key].length > 0
    );
    observed.context_policy = extras.length > 0 ? 'host-configured' : 'bare';
  }
  if (record.type === 'assistant' && typeof record.message?.model === 'string') {
    observed.model ??= record.message.model;
  }
}
