import path from "path";
import fs from "fs/promises";
import os from "os";
import { CompleteStdioOptions } from "./BasicSpawn";
import { spawn } from "child_process";
import { backOff } from "../Utilities/util";
import { DockerHelper } from "./Process";

export interface MountOption {
    type?: "bind" | "tmpfs";
    source: string;
    destination?: string;
    readonly?: boolean;
}
export interface SpawnOption {
    bindMount?: MountOption[];
    memoryLimit?: number;
    pidLimit?: number;
    fileLimit?: number;
    stdio?: CompleteStdioOptions;
    env?: {
        [key: string]: string;
    };
    uid?: number;
    gid?: number;
    cwd?: string;
}
export async function dockerSpawn(
    command: string,
    args: string[],
    option: SpawnOption
) {
    const cidPath = path.join(os.tmpdir(), Math.random().toString());
    const basicOption = {
        stdio: option.stdio,
    };
    const dockerArgs = [];
    dockerArgs.push("run");
    dockerArgs.push("--rm");
    dockerArgs.push("--attach");
    dockerArgs.push("--init");
    dockerArgs.push("--stop-timeout=0");
    dockerArgs.push(`--cidfile=${cidPath}`);
    dockerArgs.push("--network=none");
    dockerArgs.push(`--entrypoint=${command}`);
    if (option.memoryLimit) {
        dockerArgs.push(`--memory=${option.memoryLimit}`);
        dockerArgs.push(`--memory-swap=${option.memoryLimit}`);
        dockerArgs.push("--memory-swappiness=0");
    }
    if (option.pidLimit) {
        dockerArgs.push(`--pids-limit=${option.pidLimit}`);
    }
    if (option.fileLimit) {
        const t = Math.ceil(option.fileLimit / 1024 / 1024);
        dockerArgs.push("--ulimit", `FSIZE=${t}:${t}`);
    }
    dockerArgs.push("--cpus=1.0");
    dockerArgs.push("--ulimit", `CPU=soft:soft`);
    dockerArgs.push("--ulimit", `STACK=64:64`);
    if (option.uid) {
        let s = `--user=${option.uid}`;
        if (option.gid) {
            s += `:${option.gid}`;
        }
        dockerArgs.push(s);
    }
    if (option.cwd) {
        dockerArgs.push(`--workdir=${option.cwd}`);
    }
    if (option.env) {
        for (const name in option.env) {
            dockerArgs.push("--env", `${name}=${option.env[name]}`);
        }
    }
    if (option.bindMount) {
        option.bindMount.forEach((ele) => {
            const s = `type=${ele.type ?? "bind"},source=${path.resolve(
                ele.source
            )},target=${ele.destination ?? ele.source}${
                ele.readonly ?? true ? ",readonly" : ""
            }`;
            dockerArgs.push(s);
        });
    }
    dockerArgs.push("08d22c0ceb15");
    args = [...dockerArgs, ...args];
    await fs.unlink(cidPath).catch((err) => null);
    const process = spawn("/usr/bin/docke", args, basicOption);
    const cid = await backOff(async () => {
        const cid = (await fs.readFile(cidPath)).toString("utf-8");
        if (cid.length !== 64) {
            await fs.unlink(cidPath);
            return cid;
        } else {
            throw new Error("cid file empty");
        }
    }, 500);
    Object.assign(process, new DockerHelper(cid));
    return process;
}
