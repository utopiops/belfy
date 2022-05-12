const inquirer = require('inquirer');

// import chalk

const promptNode = require('./node/index');


const languages = ['Node', 'GO', 'C#', 'Python', 'Java', 'PHP', 'Ruby'];


const questions = [
  { type: 'list', name: 'language', message: 'Choose the language', choices: languages },
];


module.exports = function (soFar) {
  inquirer
    .prompt(questions)
    .then(function (answers) {
      switch (answers.language) {
        case 'Node':
          promptNode({ ...answers, ...soFar });
          break;
        default:
          break;
      }
    });
};