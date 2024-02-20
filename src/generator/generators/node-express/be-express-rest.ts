import path from 'path'
import { Generator, GeneratorMeta } from '../..'
import { ProjectConfig } from '../../user-inputs/prompt-answers'
import { readFile, writeFile, copyFolder } from '../../../utils/file'
import { Entity, UserData } from '../../user-inputs/project-configs'
import { generateControllers, generateDatabaseFiles, generateModels } from './shared'

export class BackEndExpressRESTGenerator implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    try {
      // copy the scaffold to the output directory
      const src = path.resolve(process.cwd(), 'src', 'generator', 'generators', 'node-express', 'scaffold')
      const dest = path.join(projectConfig.base.outputPath, projectConfig.base.projectName)
      await copyFolder(src, dest)

      // generate the dynamic files for routes, controllers, etc.
      await generateTemplates(dest, userData)

      // clean up the project
      await Promise.all([])
    } catch (error) {}
  }

  getMeta(): GeneratorMeta {
    return {
      id: 'be-express-rest',
      stack: 'back',
      description: 'Node.js Express REST API',
    }
  }

  getRequiredInputs() {
    return []
  }
}

async function generateTemplates(workdir: string, userData: UserData) {
  generateDatabaseFiles(workdir, userData)
  generateModels(workdir, userData)
  generateRoutes(workdir, userData)
  generateControllers('rest-controller-factory', workdir, userData)
}

async function generateRoutes(workdir: string, userData: UserData) {
  const generatedCode = `
const express = require('express');
const router = express.Router();
const controllers = require('../controllers');

${userData.entities
  .map(
    (entity) => `

// Routes for ${entity.name}
router.get('/${entity.name.toLowerCase()}', controllers.${entity.name.toLowerCase()}Controller.getAll);
router.get('/${entity.name.toLowerCase()}/:id', controllers.${entity.name.toLowerCase()}Controller.getById);
router.post('/${entity.name.toLowerCase()}', controllers.${entity.name.toLowerCase()}Controller.create);
router.put('/${entity.name.toLowerCase()}/:id', controllers.${entity.name.toLowerCase()}Controller.update);
router.delete('/${entity.name.toLowerCase()}/:id', controllers.${entity.name.toLowerCase()}Controller.delete);
`,
  )
  .join('\n')}

module.exports = router;
`

  await writeFile(generatedCode, path.join(workdir, 'routes', 'index.js'))
}
