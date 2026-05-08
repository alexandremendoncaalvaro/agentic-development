import { detectMode } from '../lib/detect.js';
import { renderAgentsBootstrap } from '../lib/render.js';

const VALID_MODES = ['auto', 'greenfield', 'brownfield', 'audit'];

export async function initCommand(opts) {
  if (!VALID_MODES.includes(opts.mode)) {
    throw new Error(
      `invalid mode "${opts.mode}". Use one of: ${VALID_MODES.join(', ')}`
    );
  }

  const mode = opts.mode === 'auto' ? detectMode(process.cwd()) : opts.mode;
  const prompt = renderAgentsBootstrap({ mode });
  process.stdout.write(prompt);
}
