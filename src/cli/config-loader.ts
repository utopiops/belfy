import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import validate from '../generator/user-inputs/validator'
import { Entity, NavbarConfig, PageOverrideConfig } from '../generator/user-inputs/project-configs'

async function readYamlFile<T extends unknown | unknown[]>(
  fileName: string,
  encoding: BufferEncoding = 'utf8',
): Promise<T> {
  const content = await fs.promises.readFile(fileName, encoding)
  const loaded = yaml.load(content) as T
  return loaded
}

async function readAndParseYamlFiles(
  directoryPath: string,
): Promise<{ entities: Entity[]; navbar: NavbarConfig; pageOverrides: PageOverrideConfig } | null> {
  try {
    const [entities, navbar, pageOverrides] = await Promise.all([
      readYamlFile<unknown[]>(path.join(directoryPath, 'entities.yaml')),
      readYamlFile<unknown>(path.join(directoryPath, 'navbar.yaml')),
      readYamlFile<unknown>(path.join(directoryPath, 'page_overrides.yaml')),
    ])

    if (!entities || !navbar || !pageOverrides) {
      console.error('One or more YAML files could not be read.')
      return null
    }

    // Validate parsed data
    const validationResult = validate({ entities, navbar, pageOverrides })
    if (!validationResult) {
      console.error('Validation failed')
      return null
    }

    return validationResult
  } catch (error) {
    console.error('Error reading/parsing YAML files:', error)
    return null
  }
}

export default readAndParseYamlFiles
