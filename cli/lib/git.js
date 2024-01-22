const inquirer = require('inquirer');

// import chalk

const chalk = require('chalk');


const frameworks = ['React', 'Angular', 'Vue', 'Svelte', 'Next.js', 'Nuxt'];


const questions = [
  {
    type: 'list', name: 'git', message: 'Git setup', choices: [
      'Just local (you have to add the remote origin later)',
      'Local with existing remote repository (you can start pushing to your repository right away)',
      'None']
  },
];


module.exports = async function (soFar) {
  let answers = await inquirer.
    prompt(questions);

  if (answers.git === 'Local with existing remote repository (you can start pushing to your repository right away)') {
    const remoteAnswer = await inquirer.prompt([
      {
        type: 'input', name: 'gitUrl', message: 'Remote repository URL: ',
      }]);
    answers.gitUrl = remoteAnswer.gitUrl
  }
  return {...answers, ...soFar};
};