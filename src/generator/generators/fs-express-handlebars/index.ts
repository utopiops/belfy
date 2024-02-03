import { Generator, GeneratorMeta } from "../..";
import { ProjectConfig } from "../../user-inputs/prompt-answers";

export default class FullStackExpressHandlebarsGenerator implements Generator {
  async generate(projectConfig: ProjectConfig): Promise<void> {
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