import { PathReporter } from 'io-ts/lib/PathReporter'
import {
  Entity,
  EntityType,
  NavbarConfig,
  NavbarConfigType,
  PageOverrideConfig,
  PageOverrideConfigType,
} from './project-configs'

function validateEntity(entity: unknown): entity is Entity {
  const result = EntityType.decode(entity)
  if (result._tag === 'Left') {
    console.error('Invalid entity:', PathReporter.report(result))
    return false
  }
  return true
}

// Validator function for NavbarConfig
function validateNavbar(navbar: unknown, validPages: string[]): navbar is NavbarConfig {
  const result = NavbarConfigType.decode(navbar)
  if (result._tag === 'Left') {
    console.error('Invalid navbar configuration:', PathReporter.report(result))
    return false
  }

  // Semantic Validation: Ensure each navbar item corresponds to a valid page
  const { items } = result.right
  if (items.some((item) => !validPages.includes(item))) {
    console.error('Invalid navbar item(s):', items)
    return false
  }

  return true
}

// Validator function for PageOverrideConfig
function validatePageOverrides(pageOverrides: unknown, validPages: string[]): pageOverrides is PageOverrideConfig {
  const result = PageOverrideConfigType.decode(pageOverrides)
  if (result._tag === 'Left') {
    console.error('Invalid page overrides configuration:', PathReporter.report(result))
    return false
  }

  // Semantic Validation: Ensure pageOverride keys (page names) correspond to valid pages
  const pageOverrideKeys = Object.keys(result.right)
  if (pageOverrideKeys.some((pageName) => !validPages.includes(pageName))) {
    console.error('Invalid page override(s):', pageOverrideKeys)
    return false
  }
  return true
}

function validate(parsedData: {
  entities: unknown[]
  navbar: unknown
  pageOverrides: unknown
}): { entities: Entity[]; navbar: NavbarConfig; pageOverrides: PageOverrideConfig } | null {
  const { entities, navbar, pageOverrides } = parsedData

  // Validate entities
  const isEntitiesValid = entities && entities.length > 0 && entities.every(validateEntity)
  if (!isEntitiesValid) {
    console.error('Invalid entities configuration')
    return null
  }

  // Validate navbar
  const validPages = (entities as Entity[]).map((entity) => entity.name)
  const isNavbarValid = navbar && validateNavbar(navbar, validPages)
  if (!isNavbarValid) {
    console.error('Invalid navbar configuration')
    return null
  }

  // Validate page overrides
  const isPageOverridesValid = pageOverrides && validatePageOverrides(pageOverrides, validPages)
  if (!isPageOverridesValid) {
    console.error('Invalid page overrides configuration')
    return null
  }

  // All components are valid, return validated data
  return {
    entities: entities as Entity[],
    navbar: navbar as NavbarConfig,
    pageOverrides: pageOverrides as PageOverrideConfig,
  }
}

export default validate
