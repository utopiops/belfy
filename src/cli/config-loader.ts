import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import validate from '../generator/user-inputs/validator';
import { Entity, NavbarConfig, PageOverrideConfig } from '../generator/user-inputs/project-configs';

function readAndParseYamlFiles(directoryPath: string): { entities: Entity[]; navbar: NavbarConfig; pageOverrides: PageOverrideConfig } | null {
  const entitiesFilePath = path.join(directoryPath, 'entities.yaml');
  const navbarFilePath = path.join(directoryPath, 'navbar.yaml');
  const pageOverridesFilePath = path.join(directoryPath, 'page_overrides.yaml');

  try {
    // Read and parse entities YAML file
    const entitiesFileContents = fs.readFileSync(entitiesFilePath, 'utf8');
    const entities = yaml.load(entitiesFileContents) as unknown[];

    // Read and parse navbar YAML file
    const navbarFileContents = fs.readFileSync(navbarFilePath, 'utf8');
    const navbar = yaml.load(navbarFileContents);

    // Read and parse page overrides YAML file
    const pageOverridesFileContents = fs.readFileSync(pageOverridesFilePath, 'utf8');
    const pageOverrides = yaml.load(pageOverridesFileContents);

    // Validate parsed data
    const validationResult = validate({ entities, navbar, pageOverrides });
    if (!validationResult) {
      console.error('Validation failed');
      return null;
    }

    return validationResult;
  } catch (error) {
    console.error('Error reading/parsing YAML files:', error);
    return null;
  }
}


export default readAndParseYamlFiles;
