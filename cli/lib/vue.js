var shell = require('shelljs');
const { execFileSync } = require('child_process'); // We use this as shelljs doesn't support interactive programs
const { delimiter, bold, white, green } = require('./utils/output');

// import chalk

const chalk = require('chalk');


module.exports = async function (soFar) {
  console.log(chalk.cyan('New project settings'))
  delimiter();

  console.log(bold(white('name: ')), soFar.name);
  console.log(bold(white('stack: ')), soFar.stack);
  console.log(bold(white('framework: ')), soFar.framework);
  delimiter();
  console.log(white(`Creating the project ${soFar.name} ...`));
  createProject(soFar.name, soFar.uiFramework);
  handleGit(soFar.git, soFar.gitUrl);
};

const createProject = (name, uiFramework) => {
  // Vue cli asks for the PM so we just use npm here to avoid asking for it twice
  console.log(white(`Installing the Vue cli ...`));
  // install vue cli
  shell.exec('npm install -g @vue/cli');
  // create project
  execFileSync('vue', ['create', name], { stdio: 'inherit' });
  
  shell.cd(`./${name}`); // Go to the project's directory for the rest of the commands
}

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
