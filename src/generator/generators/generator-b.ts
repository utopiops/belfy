import { Generator, GeneratorMeta } from '..'
import { UserData } from '../user-inputs/project-configs'
import { ProjectConfig } from '../user-inputs/prompt-answers'

export class GeneratorB implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    await Promise.all([])
    return
  }
  getMeta(): GeneratorMeta {
    return {
      id: 'generator-b',
      stack: 'front',
      description: 'generator B',
    }
  }

  getRequiredInputs() {
    return []
  }
}
