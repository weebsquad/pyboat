/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const path = require('path');

const dirSource = path.join(path.dirname(__dirname), './', 'docs', 'i18n');
const dirOutput = path.join(path.dirname(__dirname), './', 'docs', 'i18n', 'defaults');

// clean up all files before generating
for (const file of fs.readdirSync(dirOutput)) {
  fs.unlinkSync(path.join(dirOutput, file));
}

function recursiveDefault(source, dest) {
  for (const key in source) {
    const obj = source[key];
    if (obj !== null && typeof obj === 'object') {
      if (Array.isArray(obj) && !Array.isArray(dest[key])) {
        dest[key] = obj;
        continue;
      } else {
        if (typeof (dest[key]) !== 'object') {
          dest[key] = {};
        }

        dest[key] = recursiveDefault(obj, dest[key]);
      }
      continue;
    }
    if (dest[key] === undefined || dest[key] === '') {
      dest[key] = obj;
    }
  }
  return dest;
}

const englishDefault = JSON.parse(fs.readFileSync(path.join(dirSource, 'source', 'base.json'), { encoding: 'utf8' }));
for (const file of fs.readdirSync(dirSource)) {
  if (!file.includes('.json') || file === 'ach_UG.json') {
    continue;
  }
  const json = JSON.parse(fs.readFileSync(path.join(dirSource, file), { encoding: 'utf8' }));
  const output = recursiveDefault(englishDefault, json);
  fs.writeFileSync(path.join(dirOutput, file), JSON.stringify(output));
}
