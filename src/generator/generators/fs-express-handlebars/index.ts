import path from 'path'
import { Generator, GeneratorMeta } from '../..'
import { ProjectConfig } from '../../user-inputs/prompt-answers'
import { writeFile, copyFolder } from '../../../utils/file'
import { Entity, UserData } from '../../user-inputs/project-configs'

export class FullStackExpressHandlebarsGenerator implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    // copy the scaffold to the output directory
    const src = path.resolve(process.cwd(), 'src', 'generator', 'generators', 'fs-express-handlebars', 'scaffold')
    const dest = path.join(projectConfig.base.outputPath, projectConfig.base.projectName)
    await copyFolder(src, dest)

    // render the handlebars template
    await generateTemplates(dest, userData)

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

async function generateTemplates(workdir: string, userData: UserData) {
  generateModels(workdir, userData)
  generateRoutes(workdir, userData)
  generateControllers(workdir, userData)
  generateViews(workdir, userData)
}

async function generateViews(workdir: string, userData: UserData) {
  const views = userData.entities.map((entity) => generateEntityViews(workdir, entity))
  await Promise.all(views)
}

async function generateEntityViews(workdir: string, entity: Entity) {
  await Promise.all([
    generateListView(workdir, entity),
    generateDetailsView(workdir, entity),
    generateFormView(workdir, entity),
    generateFormView(workdir, entity, true),
  ])
}

async function generateListView(workdir: string, entity: Entity) {
  const generatedCode = `
<h1>{{name}} list</h1>
  <section>
  <ul class="table-header">
    ${entity.properties
      .map((p) => {
        return `<li>${p.name}</li>`
      })
      .join('\n')}
  </ul>
  <ul class="table-body">
    {{#each model}}
    <li class="table-row">
      <ul>
      ${entity.properties
        .map((p) => {
          return `<li>{{this.${p.name}}}</li>`
        })
        .join('\n')}
      </ul>
    </li>
    {{/each}}
  </ul>
</section>
`
  await writeFile(generatedCode, path.join(workdir, 'views', 'partials', `${entity.name}-list.hbs`))
}

async function generateDetailsView(workdir: string, entity: Entity) {
  const generatedCode = `
<h1>${entity.name} Details</h1>
<section>
    <ul>
        ${entity.properties
          .map((p) => {
            return `<li><strong>${p.name}:</strong> {{model.${p.name}}}</li>`
          })
          .join('\n')}
    </ul>
</section>
`
  await writeFile(generatedCode, path.join(workdir, 'views', 'partials', `${entity.name}-details.hbs`))
}

async function generateFormView(workdir: string, entity: Entity, isUpdate: boolean = false) {
  const formTitle = isUpdate ? `Edit ${entity.name}` : `Add ${entity.name}`
  const submitButtonText = isUpdate ? 'Update' : 'Submit'
  const formAction = isUpdate
    ? `/${entity.name.toLowerCase()}/{{model.id}}?_method=PUT`
    : `/${entity.name.toLowerCase()}`

  const generatedCode = `
<h1>${formTitle} Form</h1>
<form action="${formAction}" method="POST">
    ${entity.properties
      .map((p) => {
        const defaultValue = isUpdate ? ` value="{{model.${p.name}}}"` : ''
        return `
    <div>
        <label for="${p.name}">${p.name}:</label>
        <input type="text" id="${p.name}" name="${p.name}" required${defaultValue}>
    </div>`
      })
      .join('\n')}
    <button type="submit">${submitButtonText}</button>
</form>
`
  await writeFile(
    generatedCode,
    path.join(workdir, 'views', 'partials', `${entity.name}-${isUpdate ? 'edit' : 'add'}-form.hbs`),
  )
}

async function generateControllers(workdir: string, userData: UserData) {
  const generatedCode = `
const { ${userData.entities.map((entity) => entity.name).join(', ')} } = require('../models');
const generateGenericController = require('./genericController');

${userData.entities
  .map(
    (entity) => `
const ${entity.name.toLowerCase()}Controller = generateGenericController(${entity.name});

`,
  )
  .join('')}

module.exports = {
${userData.entities.map((entity) => `  ${entity.name.toLowerCase()}Controller,`).join('\n')}
};
`

  await writeFile(generatedCode, path.join(workdir, 'controllers', 'index.js'))
}

async function generateRoutes(workdir: string, userData: UserData) {
  const generatedCode = `
const express = require('express');
const router = express.Router();

${userData.entities
  .map(
    (entity) => `
const ${entity.name.toLowerCase()}Controller = require('../controllers/${entity.name.toLowerCase()}Controller');

// Routes for ${entity.name}
router.get('/${entity.name.toLowerCase()}', ${entity.name.toLowerCase()}Controller.getAll);
router.get('/${entity.name.toLowerCase()}/:id', ${entity.name.toLowerCase()}Controller.getById);
router.post('/${entity.name.toLowerCase()}', ${entity.name.toLowerCase()}Controller.create);
router.put('/${entity.name.toLowerCase()}/:id', ${entity.name.toLowerCase()}Controller.update);
router.delete('/${entity.name.toLowerCase()}/:id', ${entity.name.toLowerCase()}Controller.delete);
`,
  )
  .join('\n')}

module.exports = router;
`

  await writeFile(generatedCode, path.join(workdir, 'routes', 'index.js'))
}

async function generateModels(workdir: string, userData: UserData) {
  const generatedCode = `
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

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

  await writeFile(generatedCode, path.join(workdir, 'models', 'index.js'))
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
