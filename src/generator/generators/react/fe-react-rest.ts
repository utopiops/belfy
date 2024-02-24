import path from 'path'
import { Generator, GeneratorMeta } from '../..'
import { ProjectConfig } from '../../user-inputs/prompt-answers'
import { writeFile, copyFolder } from '../../../utils/file'
import { UserData } from '../../user-inputs/project-configs'

export class FrontEndReactRESTGenerator implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    try {
      // copy the scaffold to the output directory
      const src = path.resolve(process.cwd(), 'src', 'generator', 'generators', 'react', 'scaffold')
      const dest = path.join(projectConfig.base.outputPath, projectConfig.base.projectName, 'fe')
      await copyFolder(src, dest)

      // generate the dynamic files for routes, controllers, etc.
      await generateTemplates(dest, userData)
    } catch (error) {}
  }

  getMeta(): GeneratorMeta {
    return {
      id: 'fe-react-rest',
      stack: 'front',
      description: 'React SPA consuming REST API. Creates the project in <destination>/fe',
    }
  }

  getRequiredInputs() {
    return []
  }
}

async function generateTemplates(workdir: string, userData: UserData) {
  generateEntities(workdir, userData)
}

async function generateEntities(workdir: string, userData: UserData) {
  const generatedCode = `export const entities = ${JSON.stringify(userData.entities, null, 2)}`
  await writeFile(generatedCode, path.join(workdir, 'src', 'entities.js'))
}
