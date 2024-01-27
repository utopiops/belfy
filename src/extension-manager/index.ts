import { Answers, QuestionCollection } from 'inquirer'

interface Option {
  id: string
  label: string
  description: string
}

type Options = {
  fullStack: Option[]
  frontEnd: Option[]
  backEnd: Option[]
}

const coreOptions: Options = {
  fullStack: [
    {
      id: 'fs-node-express',
      label: 'Full-stack with Node.js and Express',
      description: 'Build a full-stack application using Node.js and Express',
    },
  ],
  frontEnd: [
    { id: 'fe-react', label: 'Front-end with React - Consuming REST API', description: 'Build a front-end application using React' },
  ],
  backEnd: [
    {
      id: 'be-node-express',
      label: 'Back-end REST API with Node.js and Express',
      description: 'Build a back-end application using Node.js and Express',
    },
  ],
}

type OptionQuestions = Record<string, QuestionCollection<Answers>>

const coreQuestions: OptionQuestions = {
  'fs-node-express': {},
  'fe-react': {},
  'be-node-express': {}
}

function getAvailableOptions(): Options {
  // todo: load extra options (dynamicOptions) from the installed packages and return [...dynamicOptions, ...coreOptions]
  return coreOptions
}

function getQuestions(option: string) {
  // todo: get the questions from the dynamically loaded options when supported
  return coreQuestions[option];
}


export default {
  getAvailableOptions,
  getQuestions
}