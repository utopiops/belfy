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

export type ProjectConfig = (FullStackProjectConfig | SplitStackProjectConfig ) & { base: Answers}