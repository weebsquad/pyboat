import typescript from '@rollup/plugin-typescript';

import { nodeResolve } from '@rollup/plugin-node-resolve';

const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');
const ignore = require('rollup-plugin-ignore');
require('dotenv').config();

const opts = {
  __ENVIRONMENT__: JSON.stringify(require('dotenv').config().parsed),
  __GH_TOKEN__: process.env.GH_TOKEN,
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
