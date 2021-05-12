const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const json = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), './', 'docs', 'globalconf.json')));

json.version = pkg.version;
fs.writeFileSync(path.join(path.dirname(__dirname), './', 'docs', 'globalconf.json'), JSON.stringify(json, null, 2));
