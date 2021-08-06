import typescript from '@rollup/plugin-typescript';

import { nodeResolve } from '@rollup/plugin-node-resolve';

import strip from '@rollup/plugin-strip';

const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');
const ignore = require('rollup-plugin-ignore');
const pkg = require('./package.json');
require('dotenv').config();

const opts = {
  __ENVIRONMENT__: JSON.stringify(require('dotenv').config().parsed),
  __GH_TOKEN__: process.env.GH_TOKEN ?? '',
  __MASTER_WEBHOOK__: process.env.MASTER_WEBHOOK ?? '',
  __USERS_WEBHOOK__: process.env.USERS_WEBHOOK ?? '',
  __PROXY_API_KEY__: process.env.PROXY_API_KEY ?? '',
  __PROXY_API_URL__: process.env.PROXY_API_URL ?? '',
  __PROXY_API_BOT_TOKEN__: process.env.PROXY_API_BOT_TOKEN ?? '',
  __CONTROL_USERS_ROLE__: process.env.CONTROL_USERS_ROLE ?? '',
  __DATE_PUBLISH__: new Date().getTime(),
  __VERSION__: pkg.version,
};

module.exports = () => ({
  input: './src/index.ts',
  output: [
    {
      file: './dist/bundle.js',
      format: 'umd',
    },
  ],
  plugins: [
    ignore(['pylon-runtime.d.ts', 'pylon-runtime-discord.d.ts']),

    replace(opts),

    nodeResolve(),
    typescript({ lib: ['es2020'], target: 'es2020' }),
    strip({
      functions: ['console.*'],
      sourceMap: true,
      include: ['**/*.ts'],
    }),
    terser(),
  ],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      // Squelch.
      return;
    }
    warn(warning);
  },
});
