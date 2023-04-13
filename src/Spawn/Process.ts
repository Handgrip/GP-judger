import { execFile, ChildProcess, spawn } from "child_process";
import fs from "fs/promises";
import { getLogger } from "log4js";
import path from "path";
import { Usage } from "../decl";
import { backOff } from "../Utilities/util";

const CgPath = "/sys/fs/cgroup";
const DockerGroup = "docker";
enum SubSystem {
    Cpu = "cpu",
    Memory = "memory",
}
enum CpuFileName {
    UsageUser = "cpuacct.usage_user",
    UsageSys = "cpuacct.usage_sys",
    Task = "tasks",
}

enum MemoryFileName {
    MaxUsage = "memory.max_usage_in_bytes",
    Task = "tasks",
}

export interface DockerProcess extends ChildProcess {
    readonly string: string;
    exitPromise: Promise<void>;
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
    exitPromise: Promise<void>;
    private startTime: number;

    constructor(
        private readonly childProcess: ChildProcess,
        readonly cid: string
    ) {
        this.logger = getLogger(`Helper ${this.cid.substring(0, 8)}`);
        process.on("error", (err) => {
            this.logger.error(err);
        });
        this.exitPromise = new Promise((resolve) => {
            this.childProcess.on("exit", () => {
                resolve();
            });
        });
        this.startTime = Date.now();
    }
    init = async (): Promise<void> => {
        const sideProcess = spawn("/usr/bin/sleep", ["1000"]);
        sideProcess.on("error", (err) => {
            this.logger.error(err);
        });
        try {
            if (sideProcess.pid === undefined) {
                throw new Error("sidecar no pid");
            }
            this.sidecarPid = sideProcess.pid;
            await backOff(
                () =>
                    fs.writeFile(
                        path.join(
                            CgPath,
                            SubSystem.Memory,
                            DockerGroup,
                            this.cid,
                            MemoryFileName.Task
                        ),
                        this.sidecarPid.toString()
                    ),
                300
            );
            await backOff(
                () =>
                    fs.writeFile(
                        path.join(
                            CgPath,
                            SubSystem.Cpu,
                            DockerGroup,
                            this.cid,
                            MemoryFileName.Task
                        ),
                        this.sidecarPid.toString()
                    ),
                300
            );
        } catch (err) {
            this.logger.error(err);
            this.logger.error(`launch sidecar failed`);
            this.killSidecar();
            await this.terminal();
        }
    };
    measure = async (): Promise<Usage> => {
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
                real: Date.now() - this.startTime,
            },
        };
    };
    sendSignal = async (signal: number): Promise<void> => {
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
                        if (stdout.indexOf(this.cid) !== 0) {
                            this.logger.warn(stdout);
                            reject(new Error(`kill ${this.cid} failed`));
                        }
                        resolve(0);
                    }
                );
            });
        } catch (err) {
            // this.logger.error(err);
        }
    };

    terminal = (): Promise<void> => {
        return this.sendSignal(9);
    };
    stop = (): Promise<void> => {
        return Promise.resolve();
        // return this.sendSignal(19);
    };
    cont = (): Promise<void> => {
        return Promise.resolve();
        // return this.sendSignal(18);
    };
    killSidecar = (): void => {
        if (this.sidecarPid > 0) {
            process.kill(this.sidecarPid, 9);
            this.sidecarPid = 0;
        }
    };

    rmCgroup = async (): Promise<void> => {
        await fs
            .rmdir(path.join(CgPath, SubSystem.Cpu, DockerGroup, this.cid))
            .catch((err) => {
                this.logger.error(err);
            });
        await fs
            .rmdir(path.join(CgPath, SubSystem.Memory, DockerGroup, this.cid))
            .catch((err) => {
                this.logger.error(err);
            });
    };

    clean = async (): Promise<void> => {
        try {
            await this.terminal();
            this.killSidecar();

            setTimeout(() => {
                this.rmCgroup();
            }, 1000);
        } catch (err) {
            this.logger.error(err);
        }
    };
}
