const inquirer = require('inquirer');
var shell = require('shelljs');
var fs = require('fs');


const { delimiter, bold, white, green } = require('../utils/output');
const { setupJest } = require('../utils/frontend_test_frameworks');
const { setupESLint, setupPrettier } = require('../utils/linting');

// import chalk

const chalk = require('chalk');

const authLibs = [
  'Passport',
  // Todo: add more authentication frameworks
  // 'Firebase',
  // 'Cognito',
  'None'
]

const databases = [
  'MongoDB-mongoose',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'None'
]

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
  { type: 'list', name: 'auth', message: 'Authentication', choices: authLibs },
  { type: 'list', name: 'db', message: 'Database', choices: databases },
  { type: 'list', name: 'testFramework', message: 'Testing framework', choices: testFrameworks },
  { type: 'list', name: 'linting', message: 'Linting tool', choices: lintingTools },
];


async function handleExpress(soFar) {
  const answers = await inquirer
    .prompt(questions);
  delimiter();
  console.log(chalk.cyan('New project settings'))
  delimiter();

  console.log(bold(white('name: ')), soFar.name);
  console.log(bold(white('stack: ')), soFar.stack);
  console.log(bold(white('type: ')), soFar.appType);
  console.log(bold(white('language: ')), answers.language);
  console.log(bold(white('pm: ')), answers.pm);
  console.log(bold(white('authentication: ')), answers.auth);
  console.log(bold(white('database: ')), answers.db);
  console.log(bold(white('testFramework: ')), answers.testFramework);
  console.log(bold(white('linting: ')), answers.linting);

  delimiter();
  console.log(white(`Creating the project ${soFar.name} ...`));
  createProject(answers.pm, soFar.name, answers.language, soFar.uiFramework);
  handleGit(soFar.name, soFar.git, soFar.gitUrl);
  handleAuthentication(answers.pm, answers.auth);
  handleDatabase(answers.db, answers.pm);
  handleTestFramework(answers.testFramework, answers.pm);
  handleLinting(answers.linting, answers.pm);
};

const createProject = (pm, name, language, uiFramework) => {
  shell.mkdir(name) // create the project directory
  shell.cd(name); // move to the project directory
  shell.exec('npm init -y'); // initialize npm
  shell.mkdir('src', 'test'); // create the src directory

  // install express
  if (pm === 'Npm') {
    shell.exec('npm install express');
  } else {
    shell.exec('yarn add express');
  }

  const subFolders = [
    'src/controllers',
    'src/models',
    'src/routes',
    'src/services',
    'src/utils',
    'src/views'
  ]

  shell.mkdir(...subFolders); // create the sub-folders
  // create the index.js file
  fs.writeFileSync(language === 'JavaScript' ? 'src/index.js' : 'src/index.ts', '');
  console.log(green(`Project created`));
}

const handleGit = (name, git, gitUrl) => {
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

const handleAuthentication = (pm, auth) => {
  // TODO: move this to a separate file and
  if (auth === 'Passport') {
    if (pm === 'Npm') {
      shell.exec('npm install passport');
    } else {
      shell.exec('yarn add passport');
    }
  }
}

const handleDatabase = (db, pm) => {
  if (db === 'MongoDB-mongoose') {
    if (pm === 'Npm') {
      shell.exec('npm install mongoose');
    } else {
      shell.exec('yarn add mongoose');
    }
  } else if (db === 'MongoDB') {
    if (pm === 'Npm') {
      shell.exec('npm install mongodb');
    } else {
      shell.exec('yarn add mongodb');
    }
  } else if (db === 'PostgreSQL') {
    if (pm === 'Npm') {
      shell.exec('npm install pg');
    } else {
      shell.exec('yarn add pg');
    }
  } else if (db === 'MySQL') {
    if (pm === 'Npm') {
      shell.exec('npm install mysql');
    } else {
      shell.exec('yarn add mysql');
    }
  }
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

module.exports = {
  handleExpress
}