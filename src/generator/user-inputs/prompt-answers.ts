import { Answers } from 'inquirer'

type FullStackProjectConfig = {
  setup: 'fullStack'
  fsAnswers: Answers
}

type SplitStackProjectConfig = {
  setup: 'splitStack'
  beAnswers: Answers
  feAnswers: Answers
}

export interface BaseConfig extends Answers {
  projectName: string
  dataDefinitionsPath: string
  outputPath: string
  fullStack: string
  selectedBackEnd: string
  selectedFrontEnd: string
  selectedFullStack: string
}

export type ProjectConfig = (FullStackProjectConfig | SplitStackProjectConfig) & { base: BaseConfig }
