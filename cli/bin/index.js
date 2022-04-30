#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const packageJson = require('../package.json')

const create = require('../lib/create');


program
  .version(packageJson.version, '-v, --version')
  .command('create')
  .description('Create new project')
  .alias('c')
  .action(async () => await create());

  program.parse(process.argv);