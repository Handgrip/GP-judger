import path from "path";
import { getConfig } from "../../Config";
import { RunOption, Language, LanguageConfigureOption } from "./decl";
import { MountOption } from "../";

export class CPP extends Language {
    private src = "src.cpp";
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
            "--std=c++17",
        ];
        // default on
        compilerOptions.push("-O2");
        // default on
        compilerOptions.push("-static");
        // default on
        compilerOptions.push("-lm");
        compilerOptions.push("-I/usr/local/lib/GP");
        const bindMount: MountOption[] = [
            {
                source: this.compileDir,
                destination: this.compileDir,
                type: "bind",
                readonly: false,
            },
        ];
        // default off
        // if (this.excutable.environment.options?.testlib === true) {
        //     bindMount.push({
        //         source: getConfig().language.testlib,
        //         destination: path.join(this.compileDir, "testlib.h"),
        //         type: "bind",
        //         readonly: true,
        //     });
        // }
        return {
            skip: false,
            command: getConfig().language.cpp,
            args: compilerOptions,
            spawnOption: {
                bindMount: bindMount,
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
