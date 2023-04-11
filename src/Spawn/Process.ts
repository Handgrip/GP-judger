import { execFile, ChildProcess } from "child_process";
import fs from "fs/promises";
import { getLogger } from "log4js";
import path from "path";
import { Usage } from "src/decl";

const logger = getLogger("Process");

const CgPath = "/sys/fs/cgroup";
const DockerGroup = "docker";
enum SubSystem {
    Cpu = "cpu",
    Memory = "memory",
}
enum CpuFileName {
    UsageUser = "cpuacct.usage_user",
    UsageSys = "cpuacct.usage_sys",
}

enum MemoryFileName {
    MaxUsage = "memory.max_usage_in_bytes",
}

export interface DockerProcess extends ChildProcess {
    readonly string: string;
    measure(): Promise<Usage>;
    terminal(): Promise<void>;
}

export class DockerHelper {
    constructor(readonly cid: string) {}
    async measure(): Promise<Usage> {
        const memory = parseInt(
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
        const usr = Math.floor(
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
        const sys = Math.floor(
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
        return {
            memory: memory,
            time: {
                usr: usr,
                sys: sys,
                real: 0,
            },
        };
    }
    async sendSignal(signal: number = 9): Promise<void> {
        try {
            await new Promise((resolve, reject) => {
                execFile(
                    "/usr/bin/docker",
                    ["kill", `--signal=${signal}`, this.cid],
                    (error, stdout, stderr) => {
                        if (error) reject(error);
                        if (stderr) {
                            logger.warn(stderr);
                        }
                        if (stdout.indexOf(this.cid) == -1) {
                            logger.warn(stdout);
                            reject(new Error(`kill ${this.cid} failed`));
                        }
                        resolve(0);
                    }
                );
            });
        } catch (err) {
            logger.error(err);
        }
    }

    terminal(): Promise<void> {
        return this.sendSignal(9);
    }
    stop() {
        return this.sendSignal(19);
    }
    cont() {
        return this.sendSignal(18);
    }
}
