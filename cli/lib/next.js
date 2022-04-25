const inquirer = require('inquirer');

// import chalk

const chalk = require('chalk');

const uiFrameworks = ['Ant Design', 'BalmUI', 'Bootstrap', 'Buefy', 'Chakra UI', 'Element', 'Oruga', 'Tachyons', 'Tailwind CSS', 'Windi CSS', 'Vant'];
const testFrameworks = ['Jest', 'Mocha', 'Enzyme', 'None'];
const lintingTools = ['TSLint', 'ESLint', 'Prettier', 'StyleLint', 'Commitlint', 'None'];


const questions = [
  { type: 'list', name: 'language', message: 'Programming language', choices: ['Typescript', 'Javascript'] },
  { type: 'list', name: 'pm', message: 'Package manager', choices: ['Yarn', 'Npm'] },
  { type: 'list', name: 'uiFramework', message: 'UI framework', choices: uiFrameworks },
  { type: 'list', name: 'testFramework', message: 'Testing framework', choices: testFrameworks },
  { type: 'list', name: 'linting', message: 'Linting tool', choices: lintingTools },
];


module.exports = function (soFar) {
  inquirer
      .prompt(questions)
      .then(function (answers) {
          console.log(chalk.cyan('New project settings'))
          console.log(chalk.white('------------------'));

          console.log(chalk.bold(chalk.white('stack: ')), soFar.stack);
          console.log(chalk.bold(chalk.white('framework: ')), soFar.framework);
          console.log(chalk.bold(chalk.white('language: ')), answers.language);
          console.log(chalk.bold(chalk.white('pm: ')), answers.pm);
          console.log(chalk.bold(chalk.white('uiFramework: ')), answers.uiFramework);
          console.log(chalk.bold(chalk.white('testFramework: ')), answers.testFramework);
          console.log(chalk.bold(chalk.white('linting: ')), answers.linting);

          // promptNext(answers);
          
      });
};