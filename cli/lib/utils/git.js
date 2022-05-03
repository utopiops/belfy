var shell = require('shelljs');
const { green } = require('./output');

const handleGit = (git, gitUrl) => {
  shell.exec('ls -l');
  if (git != 'None') {
    shell.exec(`git init`);
    if (git === 'Local with existing remote repository (you can start pushing to your repository right away)') {
      shell.exec(`git remote add origin ${gitUrl}`);
    }
    console.log(green(`Git initialized`));
  } else {
    console.log(green(`Git initialization skipped`));
  }
}

module.exports = { handleGit };