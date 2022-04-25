const inquirer = require('inquirer');

// import chalk

const chalk = require('chalk');
const promptFrontend = require('./frontend');


const stacks = ['frontend','backend','fullstack'];


const questions = [
  { type: 'input', name: 'name', message: 'Project name'},
  { type: 'list', name: 'stack', message: 'Choose the stack', choices: stacks },
  // { type: 'list', name: 'sugarLevel', message: 'Choose your sugar level', choices: values.sugarPlain },
  // { type: 'confirm', name: 'decaf', message: 'Do you prefer your coffee to be decaf?', default: false },
  // { type: 'confirm', name: 'cold', message: 'Do you prefer your coffee to be cold?', default: false },
  // { type: 'list', name: 'servedIn', message: 'How do you prefer your coffee to be served in', choices: values.servedIn },
  // { type: 'confirm', name: 'stirrer', message: 'Do you prefer your coffee with a stirrer?', default: true },
];


module.exports = function () {
  inquirer
      .prompt(questions)
      .then(function (answers) {
          console.log(chalk.bold(chalk.white('stack: ')), answers.stack);
          switch (answers.stack) {
            case 'frontend':
              promptFrontend(answers);
              break;
            // case 'backend':
            //   promptBackend(answers);
            //   break;
            // case 'fullstack':
            //   promptFullstack(answers);
            //   break;
            default:
              break;
          }
          
      });
};