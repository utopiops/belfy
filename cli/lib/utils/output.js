const chalk = require('chalk');

function delimiter() {
  console.log(chalk.white('===================='));
}

module.exports = {
  delimiter,
  bold: chalk.bold,
  white: chalk.white,
  cyan: chalk.cyan,
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
  
}