import { Generator, GeneratorMeta } from "../..";
import { ProjectConfig } from "../../user-inputs/prompt-answers";

export default class FullStackExpressHandlebarsGenerator implements Generator {
  async generate(projectConfig: ProjectConfig): Promise<void> {
    // copy the scaffold to the output directory


    // render the handlebars template


    // clean up the project

     await Promise.all([]);
     return
  }
  getMeta(): GeneratorMeta {
    return {
      id: 'generator-a',
      stack: 'full',
      description: 'generator A'
    }
  }

  getRequiredInputs() {
    return []
  }
}