const shell = require('shelljs');
const { updateProperty } = require('./package_json_manipulation');


function setupJest(pm, path) {
  console.log(`pwd: ${shell.pwd()}`);
  if (pm === 'Yarn') {
    shell.exec('yarn add --dev react-test-renderer');
  } else {
    shell.exec('npm install --save-dev react-test-renderer');
  }
  updateProperty('scripts.test', 'jest');
}

// export
module.exports = {
  setupJest,
};