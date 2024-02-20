import path from 'path'
import { readFile, writeFile } from '../../../utils/file'
import { UserData } from '../../user-inputs/project-configs'

export async function generateModels(workdir: string, userData: UserData) {
  const generatedCode = `
const { DataTypes } = require('sequelize');
const { sequelize } = require('./config');

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
            ${property.reference ? `references: { model: '${property.reference.model}', key: '${property.reference.property}' },` : ''}
        },`,
          )
          .join('')}
    };
    
    const ${entity.name} = sequelize.define('${entity.name}', properties, { tableName: '${entity.name}' }); // We want to know the exact table names to use in references
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

// ---------------
export async function generateDatabaseFiles(workdir: string, userData: UserData) {
  // todo: get the dialect from the userData
  const dialect: 'mysql' | 'postgresql' = 'mysql'
  // Map dialects to package names and versions
  const packages = {
    mysql: { name: 'mysql2', version: '*' },
    postgres: { name: 'pg', version: '*' },
  }

  // Get package details based on the dialect
  const { name: packageName, version } = packages[dialect]

  // Update package.json to include the necessary dependency
  updatePackageJson(workdir, packageName, version)

  // Generate the database configuration code based on the dialect
  const dialectUpperCase = dialect.toUpperCase()
  const dbConfigCode = `
// ${dialect} configuration
const sequelize = new Sequelize({
    dialect: '${dialect}',
    database: process.env.${dialectUpperCase}_DATABASE,
    username: process.env.${dialectUpperCase}_USER,
    password: process.env.${dialectUpperCase}_PASSWORD,
    host: process.env.${dialectUpperCase}_HOST,
    port: process.env.${dialectUpperCase}_PORT,
});
`

  // Generate the entire index.js content
  const indexFileContent = `
const { Sequelize } = require('sequelize');
${dbConfigCode}

module.exports = {sequelize};
`

  await writeFile(indexFileContent, path.join(workdir, 'models', 'config.js'))
}

// Helper function to update package.json with the specified dependency and version
async function updatePackageJson(workdir: string, packageName: string, version: string) {
  const packageJsonPath = path.join(workdir, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath))
  if (!packageJson.dependencies) {
    packageJson.dependencies = {}
  }
  packageJson.dependencies[packageName] = version
  writeFile(JSON.stringify(packageJson, null, 2), packageJsonPath, true)
}

// --------------
export async function generateControllers(controllerFactoryFile: string, workdir: string, userData: UserData) {
  const generatedCode = `
const { ${userData.entities.map((entity) => entity.name).join(', ')} } = require('../models');
const controllerFactory = require('./${controllerFactoryFile}');

${userData.entities
  .map(
    (entity) => `
const ${entity.name.toLowerCase()}Controller = controllerFactory(${entity.name});

`,
  )
  .join('')}

module.exports = {
${userData.entities.map((entity) => `  ${entity.name.toLowerCase()}Controller,`).join('\n')}
};
`

  await writeFile(generatedCode, path.join(workdir, 'controllers', 'index.js'))
}
