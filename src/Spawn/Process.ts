import { execFile, ChildProcess, spawn } from "child_process";
import fs from "fs/promises";
import { getLogger } from "log4js";
import path from "path";
import { Usage } from "src/decl";

const CgPath = "/sys/fs/cgroup";
const DockerGroup = "docker";
enum SubSystem {
    Cpu = "cpu",
    Memory = "memory",
}
enum CpuFileName {
    UsageUser = "cpuacct.usage_user",
    UsageSys = "cpuacct.usage_sys",
    Task = "task",
}

enum MemoryFileName {
    MaxUsage = "memory.max_usage_in_bytes",
    Task = "task",
}

export interface DockerProcess extends ChildProcess {
    readonly string: string;
    measure(): Promise<Usage>;
    terminal(): Promise<void>;
    init(): Promise<void>;
    sendSignal(signal: number): Promise<void>;
    stop(): Promise<void>;
    cont(): Promise<void>;
    killSidecar(): void;
    rmCgroup(): Promise<void>;
    clean(): Promise<void>;
}

export class DockerHelper {
    private sidecarPid = -1;
    private readonly logger;
    exited: Promise<void>;
    private

    constructor(
        private readonly childProcess: ChildProcess,
        readonly cid: string
    ) {
        this.logger = getLogger(`Helper ${this.cid.substring(0, 8)}`);
        process.on("error", (err) => {
            this.logger.error(err);
        });
        this.exited = new Promise((resolve) => {
            this.childProcess.on("exit", () => {
                resolve();
            });
        });
    }
    async init(): Promise<void> {
        const sideProcess = spawn("/usr/bin/sleep", ["1000"]);
        sideProcess.on("error", (err) => {
            this.logger.error(err);
        });
        this.sidecarPid = sideProcess.pid;
        try {
            await fs.writeFile(
                path.join(
                    CgPath,
                    SubSystem.Memory,
                    DockerGroup,
                    this.cid,
                    MemoryFileName.Task
                ),
                this.sidecarPid.toString()
            );
            await fs.writeFile(
                path.join(
                    CgPath,
                    SubSystem.Cpu,
                    DockerGroup,
                    this.cid,
                    CpuFileName.Task
                ),
                this.sidecarPid.toString()
            );
        } catch (err) {
            this.logger.error(`launch sidecar failed`);
            this.killSidecar();
        }
    }
    async measure(): Promise<Usage> {
        let memory = 2147483647,
            usr = 2147483647,
            sys = 2147483647;
        try {
            memory = parseInt(
                (
                    await fs.readFile(
                        path.join(
                            CgPath,
                            SubSystem.Memory,
                            DockerGroup,
                            this.cid,
                            MemoryFileName.MaxUsage
                        )
                    )
                ).toString("utf-8")
            );
            usr = Math.floor(
                parseInt(
                    (
                        await fs.readFile(
                            path.join(
                                CgPath,
                                SubSystem.Cpu,
                                DockerGroup,
                                this.cid,
                                CpuFileName.UsageUser
                            )
                        )
                    ).toString("utf-8")
                ) / 1000000
            );
            sys = Math.floor(
                parseInt(
                    (
                        await fs.readFile(
                            path.join(
                                CgPath,
                                SubSystem.Cpu,
                                DockerGroup,
                                this.cid,
                                CpuFileName.UsageSys
                            )
                        )
                    ).toString("utf-8")
                ) / 1000000
            );
        } catch (err) {
            this.logger.error(err);
        }
        return {
            memory: memory,
            time: {
                usr: usr,
                sys: sys,
                real: 0,
            },
        };
    }
    async sendSignal(signal: number): Promise<void> {
        try {
            await new Promise((resolve, reject) => {
                execFile(
                    "/usr/bin/docker",
                    ["kill", `--signal=${signal}`, this.cid],
                    (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                        }
                        if (stderr) {
                            this.logger.warn(stderr);
                        }
                        if (stdout.indexOf(this.cid) == -1) {
                            this.logger.warn(stdout);
                            reject(new Error(`kill ${this.cid} failed`));
                        }
                        resolve(0);
                    }
                );
            });
        } catch (err) {
            this.logger.error(err);
        }
    }

    terminal(): Promise<void> {
        return this.sendSignal(9);
    }
    stop(): Promise<void> {
        return this.sendSignal(19);
    }
    cont(): Promise<void> {
        return this.sendSignal(18);
    }
    killSidecar(): void {
        if (this.sidecarPid > 0) {
            process.kill(this.sidecarPid, 9);
            this.sidecarPid = 0;
        }
    }

    async rmCgroup(): Promise<void> {
        await fs.rmdir(path.join(CgPath, SubSystem.Cpu, DockerGroup, this.cid));
        await fs.rmdir(
            path.join(CgPath, SubSystem.Memory, DockerGroup, this.cid)
        );
    }

    async clean(): Promise<void> {
        try {
            await this.terminal();
            this.killSidecar();
            await this.rmCgroup();
        } catch (err) {
            this.logger.error(err);
        }
    }
}
