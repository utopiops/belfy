import extensionManager from '../extension-manager'

import { Answers, QuestionCollection, createPromptModule } from 'inquirer'

/*
1. load extensions
2. show the options based on all the available generators
3. generate the code based on the selected options

*/

const main = async () => {
  const answers = await promptUser();
  console.log(`answers `, answers);
  if (answers.beAnswers?.fullStack === 'Yes') {
      // pass baseAnswers and fsAnswers to generator corresponding to selectedFullStack
  } else {
    // pass baseAnswers and feAnswers to generator corresponding to selectedFrontEnd
    // pass baseAnswers and beAnswers to generator corresponding to selectedBack
  }
}

type promptAnswers = {
  base: Answers
  fsAnswers?: Answers
  beAnswers?: Answers
  feAnswers?: Answers
}

const promptUser = async (): Promise<promptAnswers> => {
  /* todo: load the options in extension manager once we start supporting extensions 
    await extensionManager.load()
  */
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
        name: 'selectedBackEnd',
        message: 'Choose a back-end option:',
        when: (answers: Answers) => answers.fullStack === 'No',
        choices: options.backEnd.map((opt) => ({ name: opt.label, value: opt.id })),
      },
      {
        type: 'list',
        name: 'selectedFrontEnd',
        message: 'Choose a front-end option:',
        when: (answers: Answers) => answers.fullStack === 'No',
        choices: options.frontEnd.map((opt) => ({ name: opt.label, value: opt.id })),
      },
      {
        type: 'list',
        name: 'selectedFullStack',
        message: 'Choose a full-stack option:',
        when: (answers: Answers) => answers.fullStack === 'Yes',
        choices: options.fullStack.map((opt) => ({ name: opt.label, value: opt.id })),
      },
    ]
    const prompt = createPromptModule();
    const baseAnswers = await prompt(questions);
  
    // if fullStack ask questions specific to the selected option
    // else ask questions specific to the selected FE and BE
    let answers: Answers;
    if (baseAnswers.fullStack === 'Yes') {
      const fsQuestions = extensionManager.getQuestions(baseAnswers.selectedFullStack);
      const fsAnswers = !!fsQuestions ? await prompt(fsQuestions) : {};
      return {
        base: baseAnswers,
        fsAnswers
      }
    } else {
      const feQuestions = extensionManager.getQuestions(baseAnswers.selectedFrontEnd);
      const feAnswers = !!feQuestions ? await prompt(feQuestions) : {};
      const beQuestions = extensionManager.getQuestions(baseAnswers.selectedBackEnd);
      const beAnswers = !!beQuestions ? await prompt(beQuestions) : {};
      return {
        base: baseAnswers,
        feAnswers,
        beAnswers
      }
    }
}

main();