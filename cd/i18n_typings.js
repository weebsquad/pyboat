const { json2ts } = require('json-ts');
const fs = require('fs');
const path = require('path');

const defaultLang = 'en_US';

const json = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), './', 'docs', 'i18n', `${defaultLang}.json`)));

let txtTypings = json2ts(JSON.stringify(json));
// txtTypings = `\t${txtTypings.split('\n').join('\n\t')}`;
txtTypings = txtTypings.split('interface ').join('export interface ');
txtTypings = `/*\n\n\t\tTHIS FILE IS AUTO-GENERATED, DO NOT EDIT IT MANUALLY!\n\n*/\n\n\n\n${txtTypings}`;

fs.writeFileSync(path.join(path.dirname(__dirname), './', 'src', 'localization', 'typings.ts'), txtTypings);
