const inquirer = require('inquirer');

// import chalk

const chalk = require('chalk');
const promptFrontend = require('./frontend');
const promptBackend = require('./backend');


const stacks = ['frontend', 'backend'
  //,'fullstack'
];


const questions = [
  { type: 'input', name: 'name', message: 'Project name' },
  { type: 'list', name: 'stack', message: 'Choose the stack', choices: stacks },
];


module.exports = function () {
  inquirer
    .prompt(questions)
    .then(function (answers) {
      switch (answers.stack) {
        case 'frontend':
          promptFrontend(answers);
          break;
        case 'backend':
          promptBackend(answers);
          break;
        // case 'fullstack':
        //   promptFullstack(answers);
        //   break;
        default:
          break;
      }

    });
};