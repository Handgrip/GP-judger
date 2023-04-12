import * as crypto from "crypto";
import { Executable } from "heng-protocol";
import path from "path";
import fs from "fs";
import { Language } from "../Spawn/Language/decl";
import { FileAgent } from "./File";
import { getConfig } from "../Config";
import { CompleteStdioOptions } from "../Spawn/BasicSpawn";
import { getConfiguredLanguage } from "../Spawn/Language";
import { getLogger } from "log4js";
import { FileHandle } from "fs/promises";
import { SpawnOption, dockerSpawn } from "src/Spawn";

export const SourceCodeName = "srcCode";
export const CompileLogName = "compile.log";
export const CompileStatisticName = "compile.statistic";

export class ExecutableAgent {
    private readonly dirHash: string;
    readonly fileAgent: FileAgent;
    private compiled = false; // whether compile in this instance
    readonly configuredLanguage: Language;
    private Initialized = 0;
    protected logger = getLogger("ExecutableAgent");

    constructor(private readonly excutable: Executable) {
        this.dirHash = crypto.randomBytes(32).toString("hex");
        this.configuredLanguage = getConfiguredLanguage(
            this.excutable.environment.language,
            {
                excutable: this.excutable,
                compileDir: this.dirHash,
            }
        );

        this.fileAgent = new FileAgent(path.join("bin", this.dirHash));
    }

    /**
     * must use init() after constructor
     */
    async init(): Promise<void> {
        await this.fileAgent.init();
        this.fileAgent.add(
            SourceCodeName,
            this.excutable.source,
            this.configuredLanguage.srcFileName
        );
        this.Initialized++;
    }

    private checkInit(): void {
        if (this.Initialized !== 1) {
            throw new Error("Don't forget to call init or init multiple times");
        }
    }

    /**
     * You'd better not set args, stdio, cwd.
     * cwd is low priority.
     * @param args
     * @param stdio
     * @param cwd
     * @returns
     */
    async compile(
        args?: string[],
        stdio?: CompleteStdioOptions,
        cwd?: string
    ): Promise<MeterResult | void> {
        this.checkInit();
        if (this.compiled) {
            this.logger.warn(`skip compile, compiled: ${this.compiled}`);
            return;
        }
        await this.fileAgent.getPath(SourceCodeName);
        const languageRunOption =
            this.configuredLanguage.compileOptionGenerator();
        if (languageRunOption.skip) {
            this.compiled = true;
            return;
        }
        let compileLogFileFH: FileHandle | undefined = undefined;
        try {
            const command = languageRunOption.command;
            if (!args) {
                args = [];
            }
            if (languageRunOption.args) {
                args = [...languageRunOption.args, ...args];
            }
            const compileLogPath = path.resolve(
                this.fileAgent.dir,
                CompileLogName
            );
            compileLogFileFH = await fs.promises.open(
                compileLogPath,
                "w",
                0o700
            );
            if (stdio === undefined) {
                stdio = ["ignore", "pipe", "pipe"];
            }
            stdio[1] = compileLogFileFH.fd;
            stdio[2] = compileLogFileFH.fd;
            const spawnOption: SpawnOption = {
                cwd:
                    languageRunOption.spawnOption?.cwd ??
                    cwd ??
                    this.fileAgent.dir,
                env: languageRunOption.spawnOption?.env,
                stdio: stdio,
                uid: getConfig().judger.uid,
                gid: getConfig().judger.gid,
                memoryLimit:
                    languageRunOption.spawnOption?.memoryLimit ??
                    this.excutable.limit.compiler.memory,
                pidLimit:
                    languageRunOption.spawnOption?.pidLimit ??
                    getConfig().judger.defaultPidLimit,
                fileLimit:
                    languageRunOption.spawnOption?.fileLimit ??
                    this.excutable.limit.compiler.output,
                bindMount: languageRunOption.spawnOption?.bindMount,
            };

            const subProc = dockerSpawn(command, args, spawnOption);
            const procResult = await subProc.result;
            await compileLogFileFH.close();

            this.fileAgent.register(CompileLogName, CompileLogName);

            try {
                for (const file of this.configuredLanguage.compiledFiles) {
                    await fs.promises.access(file);
                }
            } catch (error) {
                procResult.returnCode = procResult.returnCode || 1;
            }

            const compileStatisticPath = path.resolve(
                this.fileAgent.dir,
                CompileStatisticName
            );
            await fs.promises.writeFile(
                compileStatisticPath,
                JSON.stringify(procResult),
                { mode: 0o700 }
            );
            this.fileAgent.register(CompileStatisticName, CompileStatisticName);
            this.compiled = true;
            return procResult;
        } finally {
            compileLogFileFH && (await compileLogFileFH.close());
        }
    }

    /**
     * You'd better set stdio.
     * You'd better not set cwd, args.
     * cwd is low priority.
     * @param args
     * @param stdio
     * @param cwd
     * @returns
     */
    async exec(
        cwd?: string,
        stdio?: CompleteStdioOptions,
        args?: string[]
    ): Promise<MeteredChildProcess> {
        this.checkInit();
        const languageRunOption = this.configuredLanguage.execOptionGenerator();
        if (languageRunOption.skip) {
            throw new Error("Can't skip exec");
        }
        if (!this.compiled && !this.compileCached) {
            throw new Error("Please compile first");
        } else {
            const command = languageRunOption.command;
            if (!args) {
                args = [];
            }
            if (languageRunOption.args) {
                args = [...languageRunOption.args, ...args];
            }

            const spawnOption: HengSpawnOption = {
                cwd:
                    languageRunOption.spawnOption?.cwd ??
                    cwd ??
                    this.fileAgent.dir,
                env: languageRunOption.spawnOption?.env,
                stdio: stdio,
                uid: getConfig().judger.uid,
                gid: getConfig().judger.gid,
                timeLimit:
                    languageRunOption.spawnOption?.timeLimit ??
                    this.excutable.limit.runtime.cpuTime,
                memoryLimit:
                    languageRunOption.spawnOption?.memoryLimit ??
                    this.excutable.limit.runtime.memory,
                pidLimit:
                    languageRunOption.spawnOption?.pidLimit ??
                    getConfig().judger.defaultPidLimit,
                fileLimit:
                    languageRunOption.spawnOption?.fileLimit ??
                    this.excutable.limit.runtime.output,
                tmpfsMount: languageRunOption.spawnOption?.tmpfsMount,
                bindMount: languageRunOption.spawnOption?.bindMount,
                symlink: languageRunOption.spawnOption?.symlink,
            };

            const subProc = hengSpawn(command, args, spawnOption);
            return subProc;
        }
    }

    /**
     * hey, clean me
     */
    async clean(): Promise<void> {
        await this.fileAgent.clean();
    }
}
