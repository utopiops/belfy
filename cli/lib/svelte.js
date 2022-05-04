const inquirer = require('inquirer');
var shell = require('shelljs');
const { execFileSync } = require('child_process'); // We use this as shelljs doesn't support interactive programs


const { delimiter, bold, white, green, cyan } = require('./utils/output');
const { setupAntDesign, setupBootstrap, setupTailwind } = require('./utils/ui_frameworks');
const { setupJest } = require('./utils/frontend_test_frameworks');

const uiFrameworks = ['Tailwind CSS'];
const testFrameworks = [
  'Jest',
  'None'
];


const questions = [
  { type: 'list', name: 'pm', message: 'Package manager', choices: ['Yarn', 'Npm'] },
  { type: 'list', name: 'uiFramework', message: 'UI framework', choices: uiFrameworks },
  { type: 'list', name: 'testFramework', message: 'Testing framework', choices: testFrameworks },
];


module.exports = async function (soFar) {
  const answers = await inquirer
    .prompt(questions);
  delimiter();
  console.log(cyan('New project settings'))
  delimiter();

  console.log(bold(white('name: ')), soFar.name);
  console.log(bold(white('stack: ')), soFar.stack);
  console.log(bold(white('framework: ')), soFar.framework);
  console.log(bold(white('pm: ')), answers.pm);
  console.log(bold(white('uiFramework: ')), answers.uiFramework);
  console.log(bold(white('testFramework: ')), answers.testFramework);

  delimiter();
  console.log(white(`Creating the project ${soFar.name} ...`));
  createProject(soFar.name, answers.language, soFar.uiFramework);
  handleGit(soFar.name, soFar.git, soFar.gitUrl);
  handleUIFramework(answers.uiFramework, answers.pm);
  handleTestFramework(answers.testFramework, answers.pm);
};

const createProject = (name, language, uiFramework) => {
  execFileSync('npm', ['init', 'svelte', name], { stdio: 'inherit' });
  console.log(green(`Project's base created`));
  shell.cd(`./${name}`); // Go to the project's directory for the rest of the commands
}

const handleGit = (name, git, gitUrl) => {
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

const handleUIFramework = (uiFramework, pm) => {
  // todo: add more ui frameworks
  if (uiFramework === 'Tailwind CSS') {
    setupTailwind(pm, { framework: 'Svelte' });
  }
  console.log(green(`UI framework setup completed`));
}

const handleTestFramework = (testFramework, pm) => {
  if (testFramework === 'Jest') {
    setupJest(pm);
  }
  console.log(green(`Testing framework setup completed`));
}
