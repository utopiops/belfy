import path from 'path'
import { Generator, GeneratorMeta } from '../..'
import { ProjectConfig } from '../../user-inputs/prompt-answers'
import { copyFolder } from '../../../utils/file'

export class FullStackExpressHandlebarsGenerator implements Generator {
  async generate(projectConfig: ProjectConfig): Promise<void> {
    // copy the scaffold to the output directory
    await copyFolder(
      path.resolve(process.cwd(), 'src', 'generator', 'generators', 'fs-express-handlebars', 'scaffold'),
      path.join(projectConfig.base.outputPath, projectConfig.base.projectName),
    )

    // render the handlebars template

    // clean up the project

    await Promise.all([])
    return
  }
  getMeta(): GeneratorMeta {
    return {
      id: 'fs-express-handlebars',
      stack: 'full',
      description: 'Node.js Express full-stack application with handlebars views.',
    }
  }

  getRequiredInputs() {
    return []
  }
}
