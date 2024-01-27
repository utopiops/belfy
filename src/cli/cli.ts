import extensionManager from '../extension-manager'

import { Answers, QuestionCollection, createPromptModule } from 'inquirer'

/*
1. load extensions
2. show the options based on all the available generators
3. generate the code based on the selected options

*/

const main = async () => {
  const options = extensionManager.getAvailableOptions()

  const questions: QuestionCollection<Answers> = [
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter the name of your project:',
    },
    {
      type: 'input',
      name: 'dataDefinitionsPath',
      message: 'Enter the path to the folder containing data definitions:',
    },
    {
      type: 'list',
      name: 'fullStack',
      message: 'Do you want a full-stack application?',
      choices: ['Yes', 'No'],
    },
    {
      type: 'list',
      name: 'selectedOption',
      message: 'Choose an option:',
      when: (answers: Answers) => answers.fullStack === 'Yes',
      choices: options.fullStack.map((opt) => ({ name: opt.label, value: opt.id })),
    },
    {
      type: 'list',
      name: 'selectedBackEnd',
      message: 'Choose a back-end option:',
      when: (answers: Answers) => answers.fullStack === 'No',
      choices: options.backEnd.map((opt) => ({ name: opt.label, value: opt.id })),
    },
    {
      type: 'list',
      name: 'selectedOption',
      message: 'Choose a full-stack option:',
      when: (answers: Answers) => answers.fullStack === 'Yes',
      choices: options.fullStack.map((opt) => ({ name: opt.label, value: opt.id })),
    },
  ]
  const prompt = createPromptModule();
  const answers = await prompt(questions);
}

main();

module.exports = {}
