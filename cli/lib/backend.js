const inquirer = require('inquirer');

// import chalk

const promptNode = require('./node');
const promptReact = require('./react');
const promptAngular = require('./angular');
const promptVue = require('./vue');
const promptNext = require('./next');
const promptNuxt = require('./nuxt');

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
        case 'Angular':
          promptAngular({ ...answers, ...soFar });
          break;
        case 'Vue':
          promptVue({ ...answers, ...soFar });
          break;
        case 'Svelte':
          promptNext({ ...answers, ...soFar });
          break;
        case 'Next.js':
          promptNext({ ...answers, ...soFar });
          break;
        case 'Nuxt':
          promptNuxt({ ...answers, ...soFar });
          break;
        default:
          break;
      }
    });
};