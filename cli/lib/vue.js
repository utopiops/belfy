const inquirer = require('inquirer');
var shell = require('shelljs');


const { delimiter, bold, white, green } = require('./utils/output');
const { setupAntDesign, setupBootstrap, setupTailwind } = require('./utils/ui_frameworks');
const { setupJest } = require('./utils/frontend_test_frameworks');
const { setupESLint, setupPrettier } = require('./utils/linting');

// import chalk

const chalk = require('chalk');

const uiFrameworks = ['Ant Design', 'Bootstrap', 'Chakra UI', 'Tailwind CSS'];
const testFrameworks = [
  'Jest',
  'None'
];
const lintingTools = ['ESLint', 'Prettier',
  // 'StyleLint',
  //  'Commitlint',
  'None'];


const questions = [
  { type: 'list', name: 'language', message: 'Programming language', choices: ['Typescript', 'Javascript'] },
  { type: 'list', name: 'pm', message: 'Package manager', choices: ['Yarn', 'Npm'] },
  { type: 'list', name: 'uiFramework', message: 'UI framework', choices: uiFrameworks },
  { type: 'list', name: 'testFramework', message: 'Testing framework', choices: testFrameworks },
  { type: 'list', name: 'linting', message: 'Linting tool', choices: lintingTools },
];


module.exports = async function (soFar) {
  const answers = await inquirer
    .prompt(questions);
  delimiter();
  console.log(chalk.cyan('New project settings'))
  delimiter();

  console.log(bold(white('name: ')), soFar.name);
  console.log(bold(white('stack: ')), soFar.stack);
  console.log(bold(white('framework: ')), soFar.framework);
  console.log(bold(white('language: ')), answers.language);
  console.log(bold(white('pm: ')), answers.pm);
  console.log(bold(white('uiFramework: ')), answers.uiFramework);
  console.log(bold(white('testFramework: ')), answers.testFramework);
  console.log(bold(white('linting: ')), answers.linting);

  delimiter();
  console.log(white(`Creating the project ${soFar.name} ...`));
  createProject(answers.pm, soFar.name, answers.language, soFar.uiFramework);
  handleGit(soFar.name, soFar.git, soFar.gitUrl);
  handleUIFramework(answers.uiFramework, answers.pm);
  handleTestFramework(answers.testFramework, answers.pm);
  handleLinting(answers.linting, answers.pm);
};

const createProject = (pm, name, language, uiFramework) => {
  if (uiFramework === 'Chakra UI') {
    shell.exec(`${pm === 'Yarn' ? 'yarn create react-app' : 'npx create-react-app'} ${name} ${language === 'Typescript' ? '--template @chakra-ui/typescript' : '@chakra-ui'}`);
  } else {
    shell.exec(`${pm === 'Yarn' ? 'yarn create react-app' : 'npx create-react-app'} ${name} ${language === 'Typescript' ? '--template typescript' : ''}`);
  }
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
  if (uiFramework === 'Ant Design') {
    setupAntDesign(pm);
  } else if (uiFramework === 'Bootstrap') {
    setupBootstrap(pm);
  } else if (uiFramework === 'Tailwind CSS') {
    setupTailwind(pm);
  }
  console.log(green(`UI framework setup completed`));
}

const handleTestFramework = (testFramework, pm) => {
  if (testFramework === 'Jest') {
    setupJest(pm);
  }
  console.log(green(`Testing framework setup completed`));
}

const handleLinting = (linting, pm) => {
  if (linting === 'ESLint') {
    setupESLint(pm);
  } else if (linting === 'Prettier') {
    setupPrettier(pm);
  }
  console.log(green(`Linting tool setup completed`));
}