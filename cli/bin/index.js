#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();

const create = require('../lib/create');


program
  .command('create')
  .description('Create new project')
  .alias('c')
  .action(async () => await create());

  program.parse(process.argv);