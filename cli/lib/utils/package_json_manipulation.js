const fs = require('fs');
const _ = require('lodash');

function updateProperty(property, value, fileName='./package.json') {
  const json = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  _.set(json, property, value);
  fs.writeFileSync(fileName, JSON.stringify(json, null, 2));
}

module.exports = {
  updateProperty,
};