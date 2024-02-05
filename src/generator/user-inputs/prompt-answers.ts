import { Answers } from "inquirer"

type FullStackProjectConfig = {
  setup: 'fullStack'
  fsAnswers: Answers
}

type SplitStackProjectConfig = {
  setup: 'splitStack'
  beAnswers: Answers
  feAnswers: Answers
}

interface BaseConfig extends Answers {
  projectName: string
dataDefinitionsPath: string
fullStack: string
selectedBackEnd: string
selectedFrontEnd: string
selectedFullStack: string
}

export type ProjectConfig = (FullStackProjectConfig | SplitStackProjectConfig ) & { base: BaseConfig}