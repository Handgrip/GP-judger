import path from "path";
import { getConfig } from "../../Config";
import { RunOption, Language, LanguageConfigureOption } from "./decl";

export class C extends Language {
    private src = "src.c";
    private bin = "src";

    constructor(option: LanguageConfigureOption) {
        super(option);
    }

    get compileCacheable(): boolean {
        return true;
    }

    get srcFileName(): string {
        return this.src;
    }

    compileOptionGenerator(): RunOption {
        const compilerOptions: string[] = [
            path.join(this.compileDir, this.src),
            "-o",
            path.join(this.compileDir, this.bin),
            "--std=c99",
        ];
        // default on
        compilerOptions.push("-O2");

        // default on
        compilerOptions.push("-static");
        // default on
        compilerOptions.push("-lm");
        return {
            skip: false,
            command: getConfig().language.c,
            args: compilerOptions,
            spawnOption: {
                bindMount: [
                    {
                        source: this.compileDir,
                        readonly: false,
                    },
                ],
            },
        };
    }

    get compiledFiles(): string[] {
        return [path.join(this.compileDir, this.bin)];
    }

    execOptionGenerator(): RunOption {
        const binPath = path.join(this.compileDir, this.bin);
        return {
            skip: false,
            command: binPath,
            spawnOption: {
                bindMount: [
                    {
                        source: binPath,
                        readonly: true,
                    },
                ],
            },
        };
    }
}
