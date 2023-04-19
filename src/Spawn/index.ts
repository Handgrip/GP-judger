import path from "path";
import fs from "fs/promises";
import os from "os";
import { CompleteStdioOptions } from "./BasicSpawn";
import { spawn } from "child_process";
import { backOff } from "../Utilities/util";
import { DockerHelper, DockerProcess } from "./Process";
import { getLogger } from "log4js";
const logger = getLogger("Spawn");

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
): Promise<DockerProcess> {
    const cidPath = path.join(os.tmpdir(), Math.random().toString());
    const basicOption = {
        stdio: option.stdio,
    };
    const dockerArgs = [];
    dockerArgs.push("run");
    dockerArgs.push("--rm");
    dockerArgs.push("-i");
    dockerArgs.push("--attach=STDIN");
    dockerArgs.push("--attach=STDOUT");
    dockerArgs.push("--attach=STDERR");
    dockerArgs.push("--init");
    dockerArgs.push("--pull=never");
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
        const t = option.fileLimit;
        dockerArgs.push("--ulimit", `fsize=${t}:${t}`);
    }
    dockerArgs.push("--cpus=1.0");
    dockerArgs.push("--ulimit", `cpu=1000:1000`);
    dockerArgs.push("--ulimit", `stack=67108864:67108864`);
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
            dockerArgs.push("--mount", s);
        });
    }
    dockerArgs.push("026b9ec156a6");
    args = [...dockerArgs, ...args];
    await fs.unlink(cidPath).catch((err) => null);
    const process = spawn("/usr/bin/docker", args, basicOption);
    process.on("error", (err) => {
        logger.error(err);
    });
    const cid = await backOff(async () => {
        const cid = (await fs.readFile(cidPath)).toString("utf-8");
        if (cid.length === 64) {
            await fs.unlink(cidPath);
            return cid;
        } else {
            throw new Error("cid file empty");
        }
    }, 500);
    const helper = new DockerHelper(process, cid);
    await helper.init();
    Object.assign(process, helper);
    return process as DockerProcess;
}
