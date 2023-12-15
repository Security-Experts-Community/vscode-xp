/** @type {import("prettier").Options} */
module.exports = {
    printWidth: 120,
    useTabs: false,
    tabWidth: 4,
    singleQuote: true,
    trailingComma: 'all',
    bracketSpacing: true,
    endOfLine: 'lf',
    importOrder: [
        '^types$',
        '^http-status$',
        '^(react/(.*)$)|^(react$)',
        '^react-.+$',
        '^tailwind-merge$',
        '^[~/]',
        '<THIRD_PARTY_MODULES>',
        '',
        '<BUILTIN_MODULES>',
        '',
        '^../(.*)$',
        '',
        '^[./]',
    ],
    importOrderCaseInsensitive: true,
    importOrderMergeDuplicateImports: true,
    importOrderCombineTypeAndValueImports: true,
    plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
};
