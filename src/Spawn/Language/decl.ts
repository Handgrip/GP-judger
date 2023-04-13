import { Code } from "../../decl";
import { SpawnOption } from "../";

// Extract from SpawnOption
export type RunOption =
    | { skip: true }
    | {
          skip: false;
          command: string;
          args?: string[];
          spawnOption?: SpawnOption;
      };

export interface LanguageConfigureOption {
    excutable: Code;
    compileDir: string;
}

export abstract class Language {
    readonly excutable: Code;
    compileDir: string;
    constructor(option: LanguageConfigureOption) {
        this.excutable = option.excutable;
        this.compileDir = option.compileDir;
    }
    abstract get srcFileName(): string;
    abstract get compiledFiles(): string[];
    abstract compileOptionGenerator(): RunOption;
    abstract execOptionGenerator(): RunOption;
}
