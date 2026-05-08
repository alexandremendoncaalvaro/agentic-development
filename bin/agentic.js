#!/usr/bin/env node
import { run } from '../src/index.js';

run(process.argv).catch((err) => {
  console.error(`agentic: ${err.message}`);
  process.exit(1);
});
