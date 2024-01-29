import { Answers } from "inquirer"

type fullStackProjectAnswers = {
  setup: 'fullStack'
  fsAnswers: Answers
}

type splitStackProjectAnswers = {
  setup: 'splitStack'
  beAnswers: Answers
  feAnswers: Answers
}

export type promptAnswers = (fullStackProjectAnswers | splitStackProjectAnswers ) & { base: Answers}