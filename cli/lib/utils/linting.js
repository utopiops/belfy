const shell = require('shelljs');
const { execFileSync } = require('child_process'); // We use this as shelljs doesn't support interactive programs

function setupESLint(pm) {
  if (pm === 'Yarn') {
    shell.exec('yarn add --dev eslint');
    execFileSync('yarn', ['run', 'eslint', '--init'], {stdio: 'inherit'});
  } else {
    shell.exec('npm install --save-dev eslint');
    execFileSync('npx', ['eslint', '--init'], {stdio: 'inherit'});
  }
}


module.exports = {
  setupESLint,
};