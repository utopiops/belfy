const inquirer = require('inquirer');

// import chalk

const chalk = require('chalk');

const frameworks = ['Express', 'Hapi', 'Koa', 'Meteor', 'Socket.io', 'Nest', 'Sails', 'Total', 'Feather', 'Loopback', 'Adonis', 'Derby', 'None'];
const testFrameworks = ['Jest', 'Mocha', 'Enzyme', 'None'];
const lintingTools = ['TSLint', 'ESLint', 'Prettier', 'StyleLint', 'Commitlint', 'None'];
const databases = ['MongoDB', 'MySQL', 'PostgreSQL', 'SQLite', 'MS SQL', 'None'];
const caches = ['Redis', 'Memcached', 'None'];
const queues = ['RabbitMQ', 'ActiveMQ','SQS', 'Kafka', 'None'];
const authentication = ['Passport.js', 'Auth0', 'Okta', 'None'];

const questions = [
  { type: 'list', name: 'framework', message: 'Framework', choices: frameworks },
  { type: 'list', name: 'pm', message: 'Package manager', choices: ['Yarn', 'Npm'] },
  { type: 'list', name: 'testFramework', message: 'Testing framework', choices: testFrameworks },
  { type: 'list', name: 'linting', message: 'Linting tool', choices: lintingTools },
  { type: 'list', name: 'database', message: 'Database', choices: databases },
  { type: 'list', name: 'cache', message: 'Cache', choices: caches },
  { type: 'list', name: 'authentication', message: 'Authentication', choices: authentication },
  { type: 'list', name: 'queue', message: 'Queue', choices: queues },
];


module.exports = function (soFar) {
  inquirer
    .prompt(questions)
    .then(function (answers) {
      console.log(chalk.white('======================='));
      console.log(chalk.cyan('New project settings'))
      console.log(chalk.white('======================='));

      console.log(chalk.bold(chalk.white('name: ')), soFar.name);
      console.log(chalk.bold(chalk.white('stack: ')), soFar.stack);
      console.log(chalk.bold(chalk.white('language: ')), soFar.language);
      console.log(chalk.bold(chalk.white('framework: ')), answers.framework);
      console.log(chalk.bold(chalk.white('pm: ')), answers.pm);
      console.log(chalk.bold(chalk.white('testFramework: ')), answers.testFramework);
      console.log(chalk.bold(chalk.white('linting: ')), answers.linting);
      console.log(chalk.bold(chalk.white('database: ')), answers.database);
      console.log(chalk.bold(chalk.white('cache: ')), answers.cache);
      console.log(chalk.bold(chalk.white('authentication: ')), answers.authentication);
      console.log(chalk.bold(chalk.white('queue: ')), answers.queue);


    });
};
