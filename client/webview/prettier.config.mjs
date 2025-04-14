// @ts-check

import basePrettierConfig from '../../prettier.config.mjs';

/** @type {import("prettier").Options} */
const config = {
  ...basePrettierConfig,
  plugins: ['prettier-plugin-organize-imports']
};

export default config;
