'use strict';

module.exports = {
  extends: 'airbnb-base',
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'script',
  },
  env: {
    node: true,
  },
  ignorePatterns: ["*.d.ts", "bigInt.ts", "translation.ts"],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: { sourceType: 'module' },
      env: {
        node: true,
      },
      rules: {
        'no-restricted-globals': ['error', 'require'],
      },
    },
    {
      files: 'src/*',
      env: {
        node: false,
        browser: false,
      },
    },
  ],
  rules: {
    'strict': ['error', 'global'],
    'indent': ['error', 2, {
      SwitchCase: 1,
      FunctionDeclaration: {
        parameters: 'first',
      },
      FunctionExpression: {
        parameters: 'first',
      },
      CallExpression: {
        arguments: 'first',
      },
    }],
    'camelcase': 'off',
    'no-bitwise': 'off',
    'no-iterator': 'off',
    'no-continue': 'off',
    'global-require': 'off',
    //'no-await-in-loop': 'off',
    'no-eval': 'off',
    'quote-props': ['error', 'consistent-as-needed'],
    'brace-style': ['error', '1tbs', { allowSingleLine: false }],
    'curly': ['error', 'all'],
    'no-param-reassign': 'off',
    'arrow-parens': ['error', 'always'],
    'no-multi-assign': 'off',
    'no-empty': 'off',
    'func-names': 'off',
    'import/no-unresolved': 'off',
    'no-underscore-dangle': 'off',
    'no-restricted-syntax': 'off',
    'no-prototype-builtins': 'off',
    'max-len': 'off',
    'object-curly-newline': 'off',
    'prefer-const': ['error', { destructuring: 'all' }],
    'class-methods-use-this': 'off',
    'implicit-arrow-linebreak': 'off',
    'lines-between-class-members': 'off',
    'import/no-dynamic-require': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: true,
    }],
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    'import/no-cycle': 'off',
    'max-classes-per-file': 'off',
  },
  globals: {
    pylon: false,
    discord: false,
    fetch: false,
    Request: false,
  },
};
