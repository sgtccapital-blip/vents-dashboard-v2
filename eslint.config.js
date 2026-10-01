import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'repo_git', 'paperclip', 'openclaw-core', 'openclaw-rag', 'backups', 'BrainVault', '_agent_inbox', '_uploads_tmp', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Código que corre en Node (servidor y scripts), no en el navegador
    files: ['server.js', '*.cjs', 'seed-db.js', 'scratch.js', 'get_coords.js', 'inject_*.js', 'tests/**/*.js', 'src/services/openCloudEngine.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['*.cjs', 'get_coords.js', 'scratch.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
])
