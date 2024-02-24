import path from 'path'
import { Generator, GeneratorMeta } from '../..'
import { ProjectConfig } from '../../user-inputs/prompt-answers'
import { readFile, writeFile, copyFolder } from '../../../utils/file'
import { Entity, UserData } from '../../user-inputs/project-configs'
import { generateControllers, generateDatabaseFiles, generateModels } from './shared'

export class FullStackExpressHandlebarsGenerator implements Generator {
  async generate(projectConfig: ProjectConfig, userData: UserData): Promise<void> {
    try {
      // copy the scaffold to the output directory
      const src = path.resolve(process.cwd(), 'src', 'generator', 'generators', 'node-express', 'scaffold')
      const dest = path.join(projectConfig.base.outputPath, projectConfig.base.projectName)
      await copyFolder(src, dest)

      // generate the dynamic files for routes, controllers, etc.
      await generateTemplates(dest, userData)
    } catch (error) {}
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
  generateDatabaseFiles(workdir, userData)
  generateModels(workdir, userData)
  generateRoutes(workdir, userData)
  generateControllers('fs-controller-factory', workdir, userData)
  generateViews(workdir, userData)
}

async function generateViews(workdir: string, userData: UserData) {
  const views = userData.entities.map((entity) => generateEntityViews(workdir, entity))
  await Promise.all([...views, generateNavbar(workdir, userData.entities)])
}

async function generateNavbar(workdir: string, entities: Entity[]) {
  const generatedCode = `
<nav>
    <ul class="navbar">
        ${entities
          .map(
            (entity) => `
        <li><a href="/${entity.name.toLowerCase()}">${entity.name}</a></li>
        `,
          )
          .join('\n')}
    </ul>
</nav>
`
  await writeFile(generatedCode, path.join(workdir, 'views', 'partials', 'navbar.handlebars'))
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
    <div>
        <a class="create-button" href="/${entity.name.toLowerCase()}/new">+ Create</a>
    </div>
    <div class="table">
      <div class="table-header">
          ${entity.properties
            .map((p) => {
              return `<div>${p.name}</div>`
            })
            .join('\n')}
          <div>Actions</div>
      </div>
      <div class="table-body">
          {{#each entities}}
              <div class="table-row">
                ${entity.properties
                  .map((p) => {
                    return `<div>{{${p.name}}}</div>`
                  })
                  .join('\n')}
                <div class="actions">
                    <a href="/${entity.name.toLowerCase()}/edit/{{id}}">Edit</a>
                    <button class="btn-danger" onclick="confirmDelete('{{id}}')">Delete</button>
                </div>
              </div>
          {{/each}}
      </div>
    </div>
</section>
<script>
    function confirmDelete(id) {
        if (confirm('Are you sure you want to delete this ${entity.name}?')) {
            // Send delete request to the server
            fetch('/${entity.name.toLowerCase()}/' + id, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    // Reload the page after successful deletion
                    location.reload();
                } else {
                    throw new Error('Failed to delete ${entity.name}');
                }
            })
            .catch(error => {
                console.error(error);
                alert('Failed to delete ${entity.name}. Please try again later.');
            });
        }
    }
</script>
`
  await writeFile(generatedCode, path.join(workdir, 'views', `${entity.name}-list.handlebars`))
}

async function generateDetailsView(workdir: string, entity: Entity) {
  const generatedCode = `
<h1>${entity.name} Details</h1>
<section>
    <ul>
        ${entity.properties
          .map((p) => {
            return `<li><strong>${p.name}:</strong> {{${p.name}}}</li>`
          })
          .join('\n')}
    </ul>
    <div>
        <a href="/${entity.name.toLowerCase()}/edit">Edit</a>
        <button onclick="confirmDelete()">Delete</button>
    </div>
</section>
<script>
    function confirmDelete() {
        if (confirm('Are you sure you want to delete this ${entity.name}?')) {
            // Send delete request to the server
            fetch('/${entity.name.toLowerCase()}/' + id, {
                method: 'DELETE'
            })
            .then(response => {
                if (response.ok) {
                    // Redirect to list or home page after successful deletion
                    window.location.href = '/${entity.name.toLowerCase()}'; // Replace with appropriate URL
                } else {
                    throw new Error('Failed to delete ${entity.name}');
                }
            })
            .catch(error => {
                console.error(error);
                alert('Failed to delete ${entity.name}. Please try again later.');
            });
        }
    }
</script>
`
  await writeFile(generatedCode, path.join(workdir, 'views', `${entity.name}-details.handlebars`))
}

async function generateFormView(workdir: string, entity: Entity, isUpdate: boolean = false) {
  const formTitle = isUpdate ? `Edit ${entity.name}` : `Add ${entity.name}`
  const submitButtonText = isUpdate ? 'Update' : 'Submit'
  const formAction = isUpdate ? `/${entity.name.toLowerCase()}/{{entity.id}}` : `/${entity.name.toLowerCase()}`

  const generatedCode = `
<h1>${formTitle}</h1>
<form action="${formAction}" method="POST">
    ${entity.properties
      .map((p) => {
        const defaultValue = isUpdate ? ` value="{{entity.${p.name}}}"` : ''
        return `
    <div class="form-group">
        <label for="${p.name}">${p.name}:</label>
        <input type="text" id="${p.name}" name="${p.name}" class="form-control" required${defaultValue}>
    </div>`
      })
      .join('\n')}
    <button type="submit">${submitButtonText}</button>
</form>
`
  await writeFile(
    generatedCode,
    path.join(workdir, 'views', `${entity.name}-${isUpdate ? 'edit' : 'add'}-form.handlebars`),
  )
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
router.get('/${entity.name.toLowerCase()}/id/:id', controllers.${entity.name.toLowerCase()}Controller.getById);
router.get('/${entity.name.toLowerCase()}/new', controllers.${entity.name.toLowerCase()}Controller.renderCreateForm);
router.get('/${entity.name.toLowerCase()}/edit/:id', controllers.${entity.name.toLowerCase()}Controller.renderEditForm);
router.post('/${entity.name.toLowerCase()}', controllers.${entity.name.toLowerCase()}Controller.create);
router.post('/${entity.name.toLowerCase()}/:id', controllers.${entity.name.toLowerCase()}Controller.update);
router.delete('/${entity.name.toLowerCase()}/:id', controllers.${entity.name.toLowerCase()}Controller.delete);
`,
  )
  .join('\n')}

module.exports = router;
`

  await writeFile(generatedCode, path.join(workdir, 'routes', 'index.js'))
}
