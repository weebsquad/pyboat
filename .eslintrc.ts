{
    "root": true,
    "parser": "@typescript-eslint/parser",
    "plugins": [
      "@typescript-eslint"
    ],
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended"
    ],
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "script"
      },
      "env": {
        "node": true
      },
      "ignorePatterns": ["*.d.ts", "bigInt.ts", "translation.ts"],
      "overrides": [
        {
            "files": ["*.ts"],
            "parserOptions": { "sourceType": "module" },
            "env": {
                "node": true
          },
          "rules": {
            "no-restricted-globals": ["error", "require"]
          }
        },
        {
            "files": "src/*",
            "env": {
                "node": false,
                "browser": false
          }
        }
      ],
      "rules": {
        "strict": ["error", "global"],
        "indent": ["error", 2, {
            "SwitchCase": 1,
          "FunctionDeclaration": {
            "parameters": "first"
          },
          "FunctionExpression": {
            "parameters": "first"
          },
          "CallExpression": {
            "arguments": "first"
          }
        }],
        "camelcase": "off",
        "no-bitwise": "off",
        "no-iterator": "off",
        "no-continue": "off",
        "global-require": "off",
        "consistent-return": 1,
        "no-tabs": 1,
        "guard-for-in": 1,
        "no-await-in-loop": 1,
        "no-restricted-properties": 1,
        "no-eval": "off",
        "no-unused-vars": 1,
        "no-use-before-define": 1,
        "no-array-constructor": 1,
        "no-unused-expressions": "off",
        "no-plusplus": "off",
        "no-useless-escape": 1,
        "no-control-regex": 1,
        "no-loop-func": 1,
        "array-callback-return": "off",
        "block-scoped-var": 1,
        "quote-props": ["error", "consistent-as-needed"],
        "brace-style": ["error", "1tbs", { "allowSingleLine": false }],
        "curly": ["error", "all"],
        "no-param-reassign": "off",
        "arrow-parens": ["error", "always"],
        "no-multi-assign": "off",
        "no-empty": "off",
        "func-names": "off",
        "import/no-unresolved": "off",
        "no-underscore-dangle": "off",
        "no-restricted-syntax": "off",
        "no-prototype-builtins": "off",
        "max-len": "off",
        "object-curly-newline": "off",
        "prefer-const": ["error", { "destructuring": "all" }],
        "class-methods-use-this": "off",
        "implicit-arrow-linebreak": "off",
        "lines-between-class-members": "off",
        "import/no-dynamic-require": "off",
        "import/no-extraneous-dependencies": ["error", {
            "devDependencies": true
        }],
        "import/extensions": "off",
        "import/prefer-default-export": "off",
        "import/no-cycle": "off",
        "max-classes-per-file": "off"
      },
      "globals": {
        "pylon": false,
        "discord": false,
        "fetch": false,
        "Request": false
      }
  }