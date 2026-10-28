const js = require('@eslint/js');
const ts = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const hooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['*.{js,cjs}', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { ...js.configs.recommended.rules, ...prettier.rules },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2020 },
    },
    plugins: { '@typescript-eslint': ts, 'react-hooks': hooks },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      ...prettier.rules,
      // TypeScript checks declarations, including type-only DOM globals.
      'no-undef': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
