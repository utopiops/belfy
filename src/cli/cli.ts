import * as extensionManager from '../extension-manager/generators'
import { BaseConfig, ProjectConfig } from '../generator/user-inputs/prompt-answers'
import readAndParseYamlFiles from './config-loader'
import { Answers, QuestionCollection, createPromptModule } from 'inquirer'

/*
1. load extensions
2. show the options based on all the available generators
3. generate the code based on the selected options

*/

const main = async () => {
  const projectConfig = await promptUser()
  const parsed = readAndParseYamlFiles(projectConfig.base.dataDefinitionsPath)
  if (parsed === null) {
    console.log('invalid configuration, exit...')
    process.exit(1)
  }

  if (projectConfig.setup === 'fullStack') {
    // pass baseAnswers and fsAnswers to generator corresponding to selectedFullStack
    const generator = extensionManager.getGenerator(projectConfig.base.selectedFullStack)
    generator.generate(projectConfig)
  } else {
    // pass baseAnswers and feAnswers to generator corresponding to selectedFrontEnd
    // pass baseAnswers and beAnswers to generator corresponding to selectedBack
  }
}

const promptUser = async (): Promise<ProjectConfig> => {
  const options = extensionManager.getGeneratorsMeta()
  const questions: QuestionCollection<BaseConfig> = [
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
      type: 'input',
      name: 'outputPath',
      message:
        'Enter the path to create the project (a project with the project name you entered earlier will be created inside this path):',
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
      choices: options.filter((opt) => opt.stack === 'back')?.map((opt) => ({ name: opt.id, value: opt.id })),
    },
    {
      type: 'list',
      name: 'selectedFrontEnd',
      message: 'Choose a front-end option:',
      when: (answers: Answers) => answers.fullStack === 'No',
      choices: options.filter((opt) => opt.stack === 'front')?.map((opt) => ({ name: opt.id, value: opt.id })),
    },
    {
      type: 'list',
      name: 'selectedFullStack',
      message: 'Choose a full-stack option:',
      when: (answers: Answers) => answers.fullStack === 'Yes',
      choices: options.filter((opt) => opt.stack === 'full')?.map((opt) => ({ name: opt.id, value: opt.id })),
    },
  ]
  const prompt = createPromptModule()
  const baseAnswers = await prompt(questions)

  // if fullStack ask questions specific to the selected generator
  // else ask questions specific to the selected FE and BE generators
  let answers: Answers
  if (baseAnswers.fullStack === 'Yes') {
    const fsQuestions = extensionManager.getGenerator(baseAnswers.selectedFullStack).getRequiredInputs()
    const fsAnswers = !!fsQuestions ? await prompt(fsQuestions) : {}
    return {
      setup: 'fullStack',
      base: baseAnswers,
      fsAnswers,
    }
  } else {
    const feQuestions = extensionManager.getGenerator(baseAnswers.selectedFrontEnd).getRequiredInputs()
    const feAnswers = !!feQuestions ? await prompt(feQuestions) : {}
    const beQuestions = extensionManager.getGenerator(baseAnswers.selectedBackEnd).getRequiredInputs()
    const beAnswers = !!beQuestions ? await prompt(beQuestions) : {}
    return {
      setup: 'splitStack',
      base: baseAnswers,
      feAnswers,
      beAnswers,
    }
  }
}

main()
