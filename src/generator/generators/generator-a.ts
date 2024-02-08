import { Answers } from 'inquirer'
import { Generator, GeneratorMeta } from '..'
import { ProjectConfig } from '../user-inputs/prompt-answers'
import { UserData } from '../user-inputs/project-configs'

export class GeneratorA implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    await Promise.all([])
    return
  }
  getMeta(): GeneratorMeta {
    return {
      id: 'generator-a',
      stack: 'full',
      description: 'generator A',
    }
  }

  getRequiredInputs() {
    return []
  }
}
