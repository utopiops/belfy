const inquirer = require('inquirer');
const { handleExpress } = require('./express');

// import chalk
const appTypes = [
  'REST API',
  'GraphQL API',
  'Background service',
]

const restFrameworks = [
  'Express',
  'Hapi',
]

const questions = [
  { type: 'list', name: 'language', message: 'Programming language', choices: ['Typescript', 'Javascript'] },
  { type: 'list', name: 'pm', message: 'Package manager', choices: ['Yarn', 'Npm'] },
  { type: 'list', name: 'appType', message: 'Type', choices: appTypes },
];


module.exports = async function (soFar) {
  const answers = await inquirer
    .prompt(questions);

  if (answers.appType === 'REST API') {
    const { framework } = await inquirer
      .prompt({ type: 'list', name: 'framework', message: 'Framework', choices: restFrameworks });
    console.log(`framework: ${framework}`);

    switch (framework) {
      case 'Express':
        handleExpress({ ...answers, ...soFar });
        break;
    }
  }
};

