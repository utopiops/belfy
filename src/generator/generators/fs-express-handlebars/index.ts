import path from 'path'
import { Generator, GeneratorMeta } from '../..'
import { ProjectConfig } from '../../user-inputs/prompt-answers'
import { writeFile, copyFolder } from '../../../utils/file'
import { UserData } from '../../user-inputs/project-configs'

export class FullStackExpressHandlebarsGenerator implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    // copy the scaffold to the output directory
    const src = path.resolve(process.cwd(), 'src', 'generator', 'generators', 'fs-express-handlebars', 'scaffold')
    const dest = path.join(projectConfig.base.outputPath, projectConfig.base.projectName)
    await copyFolder(src, dest)

    // render the handlebars template
    await renderTemplates(projectConfig, dest, userData)

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

async function renderTemplates(projectConfig: ProjectConfig, workdir: string, userData: UserData) {
  renderModels(projectConfig, workdir, userData)
  generateRoutes(projectConfig, workdir, userData)
}

async function generateRoutes(projectConfig: ProjectConfig, workdir: string, userData: UserData) {
  const generatedCode = `
import express from 'express';
const router = express.Router();

${userData.entities
  .map(
    (entity) => `
import ${entity.name.toLowerCase()}Controller from '../controllers/${entity.name.toLowerCase()}Controller';

// Routes for ${entity.name}
router.get('/${entity.name.toLowerCase()}', ${entity.name.toLowerCase()}Controller.getAll);
router.get('/${entity.name.toLowerCase()}/:id', ${entity.name.toLowerCase()}Controller.getById);
router.post('/${entity.name.toLowerCase()}', ${entity.name.toLowerCase()}Controller.create);
router.put('/${entity.name.toLowerCase()}/:id', ${entity.name.toLowerCase()}Controller.update);
router.delete('/${entity.name.toLowerCase()}/:id', ${entity.name.toLowerCase()}Controller.delete);
`,
  )
  .join('\n')}

export default router;
`

  return generatedCode
}

async function renderModels(projectConfig: ProjectConfig, workdir: string, userData: UserData) {
  const generatedCode = `
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize';

interface Property {
    name: string;
    type: string;
    primaryKey?: boolean;
    reference?: string;
}

interface Entity {
    name: string;
    properties: Property[];
}

// Define function to map types
const mapType = (type: string): string => {
    // Add your logic to map Sequelize data types to TypeScript types
    return type;
};

${userData.entities
  .map(
    (entity) => `
// Define function to define ${entity.name} model
const define${entity.name}Model = () => {
    const properties = {
        ${entity.properties
          .map(
            (property) => `
        ${property.name}: {
            type: DataTypes.${mapSequelizeType(property.type)},
            ${property.primaryKey ? `primaryKey: true,` : ''}
            ${property.reference ? `references: { model: '${property.reference}', key: '${property.reference}' },` : ''}
        },`,
          )
          .join('')}
    };
    
    const ${entity.name} = sequelize.define('${entity.name}', properties);
    return ${entity.name};
};

const ${entity.name} = define${entity.name}Model();
`,
  )
  .join('')}

// Export models
module.exports = {
${userData.entities.map((entity) => `    ${entity.name},`).join('\n')}
};
`

  // write to file
  console.log(generatedCode)
  writeFile(generatedCode, path.join(workdir, 'models', 'models.js'))
}

function mapSequelizeType(type: string): string {
  switch (type) {
    case 'string':
      return 'STRING'
    case 'number':
      return 'INTEGER'
    case 'boolean':
      return 'BOOLEAN'
    case 'datetime':
      return 'DATE'
    case 'text':
      return 'TEXT'
    /* 
    TODO: decide about this. Not a good idea to store the file or image as blob, instead have to have an upload mechanism and store the url
    labels: help-wanted
    */
    case 'file':
      return 'BLOB'
    case 'image':
      return 'BLOB'
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}
