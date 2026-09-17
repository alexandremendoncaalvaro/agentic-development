import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['.agents/**', '.claude/**', '.context/**', 'node_modules/**', 'eval/fixtures/**'],
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      // The explicit astral-plane ranges intentionally combine adjacent
      // Unicode classes; replacing them with a broader property escape would
      // change the repository's emoji policy.
      'no-misleading-character-class': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
