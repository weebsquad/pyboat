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
  __GH_TOKEN__: '',
  __MASTER_WEBHOOK__: '',
  __USERS_WEBHOOK__: '',
  __PROXY_API_KEY__: '',
  __PROXY_API_URL__: '',
  __PROXY_API_BOT_TOKEN__: '',
  __CONTROL_USERS_ROLE__: '',
  __DATE_PUBLISH__: new Date().getTime(),
  __VERSION__: pkg.version,
};

module.exports = () => ({
  input: './src/index.ts',
  output: [
    {
      file: './dist_public/bundle.js',
      format: 'umd',
    },
  ],
  plugins: [
    ignore(['pylon-runtime.d.ts', 'pylon-runtime-discord.d.ts']),

    replace(opts),

    nodeResolve(),
    typescript({ lib: ['es2020'], target: 'es2020' }),
    strip({
      functions: ['console.log'],
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
