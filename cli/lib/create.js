const inquirer = require('inquirer');

// import chalk

const promptGit = require('./git');
const promptFrontend = require('./frontend');
const promptBackend = require('./backend');



const stacks = ['frontend', 'backend'
  //,'fullstack'
];


const questions = [
  { type: 'input', name: 'name', message: 'Project name: ' },
  { type: 'list', name: 'stack', message: 'Choose the stack', choices: stacks },
];


module.exports = async function () {
  let answers = await inquirer
    .prompt(questions);
  answers = await promptGit(answers);
  
  switch (answers.stack) {
    case 'frontend':
      await promptFrontend(answers);
      break;
    case 'backend':
      await promptBackend(answers);
      break;
    // case 'fullstack':
    //   promptFullstack(answers);
    //   break;
    default:
      break;
  }
};