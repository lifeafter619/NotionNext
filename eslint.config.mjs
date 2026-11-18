import { defineConfig } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tseslint from 'typescript-eslint'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map(
  config => ({
    ...config,
    // Type-checked rules only apply to tsconfig-backed files (.mjs/.cjs are
    // Node scripts outside the tsconfig project; they get a separate block
    // below with parserOptions.project disabled).
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/*.{mjs,cjs}'],
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname
      }
    }
  })
)

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.swc/**',
      'out/**',
      'coverage/**',
      'test-results/**',
      'next-env.d.ts'
    ]
  },
  // .mjs/.cjs Node scripts (cloudflare workers, build scripts) are not part of
  // the tsconfig project and must not be type-checked; relax the type-checked
  // parser requirements and provide a Node environment for them.
  {
    files: ['**/*.{mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        project: false
      }
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'no-undef': 'off'
    }
  },
  ...nextVitals,
  ...nextTs,
  ...typeCheckedConfigs,
  prettierConfig,
  {
    rules: {
      semi: 0,
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off',
      'space-before-function-paren': 0,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/require-await': 'off',
      'prefer-const': 'off',
      reportUnusedDisableDirectives: 'off'
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-return': 'off'
    }
  }
])
