/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  // Formatação geral
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  jsxSingleQuote: false,
  semi: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',

  // Ordenação de imports por grupos/diretórios com linhas em branco entre grupos
  importOrder: [
    '^react$',
    '^react/(.*)$',

    '',
    '<THIRD_PARTY_MODULES>',
    '<BUILTIN_MODULES>',

    // Alias do projeto
    '',
    '^@/accounts/(.*)$',
    '^@/animations/(.*)$',
    '^@/assets/(.*)$',

    // Atomic design
    '',
    '^@/atomic/base-components/(.*)$',
    '',
    '^@/atomic/components/(.*)$',
    '',
    '^@/atomic/features/[^/]+/components/.*$',
    '',
    '^@/atomic/features/[^/]+/constants/.*$',
    '',
    '^@/atomic/features/[^/]+/helpers/.*$',
    '',
    '^@/atomic/features/[^/]+/hooks/.*$',
    '',
    '^@/atomic/features/[^/]+/models/.*$',
    '',
    '^@/atomic/features/[^/]+/store/.*$',
    '',
    '^@/atomic/modules/(.*)$',

    // Demais camadas
    '',
    '^@/config/(.*)$',
    '',
    '^@/helpers/(.*)$',
    '',
    '^@/hooks/(.*)$',
    '',
    '^@/lib/(.*)$',
    '',
    '^@/styles/(.*)$',
    '',
    '^@/translation/(.*)$',
    '',
    '^@/utils/(.*)$',
    '',
    '^@/wrappers/(.*)$',

    // Imports relativos por último
    '',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],

  plugins: ['@ianvs/prettier-plugin-sort-imports'],
}

export default config
