import { Answers, QuestionCollection } from "inquirer";
import { ProjectConfig } from "./user-inputs/prompt-answers";

export type GeneratorMeta = {
  id: string
  stack: 'full' | 'front' | 'back'
  description: string
  language?: string
}

export interface Generator {
  generate(projectConfig: ProjectConfig): Promise<void>
  getMeta(): GeneratorMeta
  getRequiredInputs(): QuestionCollection<Answers>
}
