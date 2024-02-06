import { Generator, GeneratorMeta } from '..'
import { ProjectConfig } from '../user-inputs/prompt-answers'

export class GeneratorB implements Generator {
  async generate(projectConfig: ProjectConfig): Promise<void> {
    await Promise.all([])
    return
  }
  getMeta(): GeneratorMeta {
    return {
      id: 'generator-b',
      stack: 'full',
      description: 'generator B',
    }
  }

  getRequiredInputs() {
    return []
  }
}
