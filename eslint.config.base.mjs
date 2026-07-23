import tseslint from 'typescript-eslint';

const config = tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.expo/**'] },
  ...tseslint.configs.recommended,
);

export default config;
