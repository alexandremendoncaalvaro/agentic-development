/**
 * The `live` subcommand's arguments (ADR-0082 decision 1): the runner is
 * required and taken verbatim, and every other option is explicit, so the
 * lane never discovers a host or a skill set on its own.
 */

export const REQUEST_PLACEHOLDER = '{request}';
export const LIVE_HOSTS = ['claude-code', 'codex'];

function fail(message) {
  throw new Error(message);
}

/**
 * Parse the `live` subcommand's arguments. The runner is required and taken
 * verbatim: `--runner` consumes every remaining argument, so a host invocation
 * keeps its own flags without this parser having to know them.
 */
export function parseLiveArgs(argv) {
  const args = [...argv];
  const caseFile = args.shift();
  if (!caseFile || caseFile.startsWith('--')) fail('live: the first argument is the case file');

  let host = null;
  let trials = 1;
  let out = null;
  let runner = null;
  let fixtureSkills = null;

  while (args.length > 0) {
    const flag = args.shift();
    if (flag === '--runner') {
      if (args.length === 0) fail('live: --runner needs the host invocation');
      runner = args.splice(0, args.length);
      break;
    }
    const value = args.shift();
    if (value === undefined) fail(`live: ${flag} needs a value`);
    if (flag === '--host') host = value;
    else if (flag === '--trials') trials = Number(value);
    else if (flag === '--out') out = value;
    else if (flag === '--fixture-skills') fixtureSkills = parseFixtureSkills(value);
    else fail(`live: unknown option ${flag}`);
  }

  if (!runner || runner.length === 0) {
    fail('live: --runner is required; this harness never discovers a host binary (ADR-0082)');
  }
  if (!runner.includes(REQUEST_PLACEHOLDER)) {
    fail(
      `live: the --runner invocation must contain ${REQUEST_PLACEHOLDER} where the request goes; ` +
        'appending it would let a variadic flag swallow the prompt'
    );
  }
  if (!host || !LIVE_HOSTS.includes(host)) {
    fail(`live: --host must be one of ${LIVE_HOSTS.join(', ')}`);
  }
  if (!Number.isInteger(trials) || trials < 1) fail('live: --trials must be a positive integer');

  return { caseFile, host, runner, trials, out, fixtureSkills };
}

// An arm of Spec 0007 R9 without touching the frozen case: the operator names
// which skills the trial copy receives, and the receipt records the list, its
// digests, and that it came from the runner rather than the case.
function parseFixtureSkills(value) {
  const skills = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  if (skills.length === 0)
    fail('live: --fixture-skills needs a comma-separated list of skill names');
  for (const name of skills) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
      fail(`live: --fixture-skills names an invalid skill "${name}"`);
    }
  }
  return skills;
}
