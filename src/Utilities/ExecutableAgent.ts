import * as crypto from "crypto";
import path from "path";
import fs from "fs";
import { Language } from "../Spawn/Language/decl";
import { FileAgent, readStream } from "./File";
import { getConfig } from "../Config";
import { CompleteStdioOptions } from "../Spawn/BasicSpawn";
import { getConfiguredLanguage } from "../Spawn/Language";
import { getLogger } from "log4js";
import { FileHandle } from "fs/promises";
import { SpawnOption, dockerSpawn } from "../Spawn";
import { timeout } from "./util";
import { Code, CompileSingleResult, Verdict } from "../decl";
import { generateVerdict } from "../God";
import { DockerProcess } from "../Spawn/Process";

export const SourceCodeName = "srcCode";
export const CompileLogName = "compile.log";
export const CompileStatisticName = "compile.statistic";

export class ExecutableAgent {
    private readonly dirHash: string;
    readonly fileAgent: FileAgent;
    private compiled = false;
    readonly configuredLanguage: Language;
    private Initialized = 0;
    protected logger = getLogger("ExecutableAgent");

    constructor(private readonly code: Code) {
        this.dirHash = crypto.randomBytes(32).toString("hex");
        this.configuredLanguage = getConfiguredLanguage(this.code.language, {
            excutable: this.code,
            compileDir: this.dirHash,
        });

        this.fileAgent = new FileAgent(path.join("bin", this.dirHash));
        this.configuredLanguage.compileDir = this.fileAgent.dir;
    }

    /**
     * must use init() after constructor
     */
    async init(): Promise<void> {
        await this.fileAgent.init();
        this.fileAgent.add(
            SourceCodeName,
            this.code.source,
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
    ): Promise<CompileSingleResult | void> {
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
        let compileLogFileFH: FileHandle | undefined = undefined,
            subProc: DockerProcess | undefined = undefined;
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
                    getConfig().judger.compileMemoryLimit,
                pidLimit:
                    languageRunOption.spawnOption?.pidLimit ??
                    getConfig().judger.defaultPidLimit,
                fileLimit:
                    languageRunOption.spawnOption?.fileLimit ??
                    getConfig().judger.fileLimit,
                bindMount: languageRunOption.spawnOption?.bindMount,
            };

            subProc = await dockerSpawn(command, args, spawnOption);
            const cancel = timeout(
                subProc,
                getConfig().judger.compileTimeLimit
            );
            await subProc.exitPromise;
            cancel();
            await compileLogFileFH.close();

            const usage = await subProc.measure();
            let verdict: Verdict = generateVerdict(
                {
                    time: getConfig().judger.compileTimeLimit,
                    memory: getConfig().judger.compileMemoryLimit,
                },
                usage,
                null,
                subProc.exitCode
            );
            if (verdict === "NR") verdict = "OK";
            const message = await readStream(
                fs.createReadStream(compileLogPath, {
                    encoding: "utf-8",
                    end: 10 * 1024,
                }),
                -1
            );

            try {
                for (const file of this.configuredLanguage.compiledFiles) {
                    await fs.promises.access(file);
                }
            } catch (error) {
                verdict = "CE";
            }

            this.compiled = true;
            return {
                message,
                ...usage,
                verdict,
            };
        } finally {
            subProc && (await subProc.clean());
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
    ): Promise<DockerProcess> {
        this.checkInit();
        const languageRunOption = this.configuredLanguage.execOptionGenerator();
        if (languageRunOption.skip) {
            throw new Error("Can't skip exec");
        }
        if (!this.compiled) {
            throw new Error("Please compile first");
        } else {
            const command = languageRunOption.command;
            if (!args) {
                args = [];
            }
            if (languageRunOption.args) {
                args = [...languageRunOption.args, ...args];
            }

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
                    this.code.limit.memory,
                pidLimit:
                    languageRunOption.spawnOption?.pidLimit ??
                    getConfig().judger.defaultPidLimit,
                fileLimit:
                    languageRunOption.spawnOption?.fileLimit ??
                    getConfig().judger.fileLimit,
                bindMount: languageRunOption.spawnOption?.bindMount,
            };

            const subProc = dockerSpawn(command, args, spawnOption);
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
