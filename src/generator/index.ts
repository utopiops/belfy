import { Answers, QuestionCollection } from 'inquirer'
import { ProjectConfig } from './user-inputs/prompt-answers'
import { UserData } from './user-inputs/project-configs'

export type GeneratorMeta = {
  id: string
  stack: 'full' | 'front' | 'back'
  description: string
  language?: string
}

type userData = {}

export interface Generator {
  generate(projectConfig: ProjectConfig, userData: UserData): Promise<void>
  getMeta(): GeneratorMeta
  getRequiredInputs(): QuestionCollection<Answers>
}
