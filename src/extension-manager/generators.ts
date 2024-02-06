import { Generator } from '../generator'
import * as Generators from '../generator/generators'

// initialization
const initLoadGenerators = (): Record<string, Generator> => {
  let generators: Record<string, Generator> = {}
  for (const key in Generators) {
    if (Object.prototype.hasOwnProperty.call(Generators, key)) {
      const generator = Generators[key as keyof typeof Generators]
      if (typeof generator === 'function') {
        const instance = new generator()
        if (instance.getMeta) {
          console.log(instance.getMeta().id, ' loaded')
          generators[instance.getMeta().id] = instance
        }
      }
    }
  }
  return generators
}
const generators = initLoadGenerators()
// end init

export const getGeneratorsMeta = () => Object.keys(generators).map((id) => generators[id].getMeta())

export const getGenerator = (generatorId: string) => generators[generatorId]
