#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

const create = require('../lib/create');


program
  .command('creat')
  .description('Create new project')
  .alias('c')
  .action(() => create());

  program.parse(process.argv);