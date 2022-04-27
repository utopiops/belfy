const fs = require('fs');
const fileName = 'package.json';

async function updateProperty(property, value) {
  fs.readFileSync(fileName, 'utf8', (err, data) => {
    if (err) throw err;
    const json = JSON.parse(data);
    json[property] = value;
    const jsonString = JSON.stringify(json, null, 2);
    fs.writeFileSync(fileName, jsonString, 'utf8', (err) => {
      if (err) throw err;
      console.log(`${fileName} updated`);
    });
  });
}

module.exports = {
  updateProperty,
};