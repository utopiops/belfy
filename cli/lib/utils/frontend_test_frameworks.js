const shell = require('shelljs');
const { execFileSync } = require('child_process'); // We use this as shelljs doesn't support interactive programs
const { updateProperty } = require('./package_json_manipulation');


function setupJest(pm, extras = {}) {
  // Only for Angular
  if (extras.framework === 'Angular') {
    execFileSync('ng', ['add', '@briebug/jest-schematic'], { stdio: 'inherit' });
    return;
  }

  // Everything else
  if (pm === 'Yarn') {
    shell.exec('yarn add --dev react-test-renderer');
  } else {
    shell.exec('npm install --save-dev react-test-renderer');
  }
  updateProperty('scripts.test', 'jest');
}

module.exports = {
  setupJest,
};