const inquirer = require('inquirer');

// import chalk

const chalk = require('chalk');
const promptReact = require('./react');
const promptAngular = require('./angular');
const promptVue = require('./vue');
const promptNext = require('./next');
const promptNuxt = require('./nuxt');

const frameworks = ['React','Angular','Vue', 'Svelte', 'Next.js', 'Nuxt'];


const questions = [
  { type: 'list', name: 'framework', message: 'Choose the framework/library', choices: frameworks },
];


module.exports = function (soFar) {
  inquirer
      .prompt(questions)
      .then(function (answers) {
          switch (answers.framework) {
            case 'React':
              promptReact({...answers, ...soFar});
              break;
            case 'Angular':
              promptAngular({...answers, ...soFar});
              break;
            case 'Vue':
              promptVue({...answers, ...soFar});
              break;
            case 'Svelte':
              promptNext({...answers, ...soFar});
              break;
            case 'Next.js':
              promptNext({...answers, ...soFar});
              break;
            case 'Nuxt':
              promptNuxt({...answers, ...soFar});
              break;
            default:
              break;
          }
      });
};