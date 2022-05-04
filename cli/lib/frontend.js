const inquirer = require('inquirer');

// import chalk

const promptReact = require('./react');
const promptAngular = require('./angular');
const promptVue = require('./vue');
const promptSvelte = require('./svelte');
const promptNext = require('./next');
const promptNuxt = require('./nuxt');

const frameworks = ['React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Nuxt'];


const questions = [
  { type: 'list', name: 'framework', message: 'Choose the framework/library', choices: frameworks },
];


module.exports = async function (soFar) {
  const answers = await inquirer
    .prompt(questions);
  switch (answers.framework) {
    case 'React':
      await promptReact({ ...answers, ...soFar });
      break;
    case 'Angular':
      await promptAngular({ ...answers, ...soFar });
      break;
    case 'Vue':
      await promptVue({ ...answers, ...soFar });
      break;
    case 'Svelte':
      await promptSvelte({ ...answers, ...soFar });
      break;
    case 'Next.js':
      await promptNext({ ...answers, ...soFar });
      break;
    case 'Nuxt':
      await promptNuxt({ ...answers, ...soFar });
      break;
    default:
      break;
  }

};