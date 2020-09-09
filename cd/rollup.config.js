'use strict';

import typescript from 'rollup-plugin-typescript2';

import { nodeResolve } from '@rollup/plugin-node-resolve';

const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');
const ignore = require('rollup-plugin-ignore');
const path = require('path');
require('dotenv').config();

let opts = {
  __ENVIRONMENT__: JSON.stringify(require('dotenv').config().parsed)
};

module.exports = () => ({
  input: './src/index.ts',
  output: [
    {
      file: './dist/bundle.ts',
      format: 'umd',
      name: "test"
    },
  ],
  plugins: [
    ignore(['pylon-runtime.d.ts', 'pylon-runtime-discord.d.ts']),
    
    replace(opts),
    
    nodeResolve({
      extensions: ['.ts'],
      rootDir: path.join(process.cwd(), '..')
    }),
    typescript(),
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
