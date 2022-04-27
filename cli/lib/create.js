const inquirer = require('inquirer');

// import chalk

const promptGit = require('./git');



const stacks = ['frontend', 'backend'
  //,'fullstack'
];


const questions = [
  { type: 'input', name: 'name', message: 'Project name: ' },
  { type: 'list', name: 'stack', message: 'Choose the stack', choices: stacks },
];


module.exports = async function () {
  const answers = await inquirer
    .prompt(questions);
  await promptGit(answers);
};