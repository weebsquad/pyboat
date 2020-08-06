'use strict';

import typescript from 'rollup-plugin-typescript2';
const resolve = require('@rollup/plugin-node-resolve');
const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');
const ignore = require('rollup-plugin-ignore');

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
    
    replace({
      __ENVIRONMENT__: JSON.stringify(require('dotenv').config().parsed),
    }),
    typescript({
        
    }),
    resolve({
      extensions: ['.ts'],
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
