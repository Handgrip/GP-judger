import path from "path";
import { getConfig } from "../../Config";
import { RunOption, Language, LanguageConfigureOption } from "./decl";

export class Java extends Language {
    private className = "Main";
    private src = "Main.java";
    private bin = "Main.class";

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
        const args: string[] = [];
        args.push("-encoding", "UTF-8");
        args.push("-sourcepath", this.compileDir);
        args.push(path.join(this.compileDir, this.src));
        return {
            skip: false,
            command: getConfig().language.javac,
            args: args,
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
        const args: string[] = [];
        args.push(
            "-Xss256k",
            `-Xms${Math.ceil(
                (this.excutable.limit.memory * 1.5) / 1024 / 1024 / 4
            )}m`,
            `-Xmx${Math.ceil(
                (this.excutable.limit.memory * 1.5) / 1024 / 1024
            )}m`
        );
        args.push("-classpath", this.compileDir);
        args.push(this.className);
        return {
            skip: false,
            command: getConfig().language.java,
            args: args,
            spawnOption: {
                bindMount: [
                    {
                        source: binPath,
                        readonly: true,
                    },
                ],
                memoryLimit: this.excutable.limit.memory * 2,
            },
        };
    }
}
