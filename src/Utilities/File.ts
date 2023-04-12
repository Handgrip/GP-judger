import fs from "fs";
import stream, { Readable } from "stream";
import path, { PlatformPath } from "path";
import util from "util";
import { getConfig } from "../Config";
import { Throttle } from "./Throttle";
import { getLogger } from "log4js";
import axios from "axios";
import { FileHandle } from "fs/promises";
const pipeline = util.promisify(stream.pipeline);

const logger = getLogger("File");

export type File = {
    hashsum?: string;
    content?: string;
    url?: string;
};

/**
 * maxTry should be small
 * @param fn
 * @param maxTry
 * @returns
 */
export function retry<T>(fn: () => Promise<T>, maxTry: number): Promise<T> {
    return fn().catch((error) => {
        if (maxTry === 1) {
            throw error;
        } else {
            return retry(fn, maxTry - 1);
        }
    });
}

export async function chownR(
    dirpath: string,
    uid: number,
    gid: number,
    depth: number = 1
): Promise<void> {
    if (depth >= 4) {
        throw new Error("too deep folder");
    }
    const curdir = await fs.promises.opendir(dirpath);
    try {
        let subItem: fs.Dirent | null;
        while ((subItem = await curdir.read()) !== null) {
            if (subItem.isDirectory()) {
                await chownR(
                    path.join(dirpath, subItem.name),
                    uid,
                    gid,
                    depth + 1
                );
            } else if (subItem.isFile()) {
                await fs.promises.chown(
                    path.join(dirpath, subItem.name),
                    uid,
                    gid
                );
            }
        }
        await fs.promises.chown(dirpath, uid, gid);
    } finally {
        await curdir.close();
    }
}

/**
 * @param s
 * @param size -1 == inf
 * @returns
 */
export function readStream(s: Readable, size: number): Promise<string> {
    let length = 0;
    const data: string[] = [];
    s.on("data", (chunk: Buffer) => {
        if (size === -1) {
            data.push(chunk.toString("utf-8"));
        } else {
            if (length < size) {
                data.push(chunk.slice(0, size - length).toString("utf-8"));
                length += chunk.byteLength;
            }
        }
    });
    return new Promise<string>((resolve, reject) => {
        s.on("end", () => resolve(data.join("")));
        s.on("error", (err) => reject(err));
    });
}

export function waitForOpen(s: fs.WriteStream | fs.ReadStream): Promise<null> {
    return new Promise<null>((resolve, reject) => {
        s.on("open", () => resolve(null));
        s.on("error", (err) => reject(err));
    });
}

export async function readableFromUrl(url: string): Promise<Readable> {
    logger.info(`Downloading ${url}`);
    return (await axios.get(url, { responseType: "stream" })).data;
}

export async function readableFromFile(file: File): Promise<Readable> {
    if (file.content !== undefined) {
        return Readable.from(file.content);
    } else {
        throw new Error("Bad file");
    }
}

export class FileAgent {
    readonly dir: string;
    private nameToFile = new Map<
        string,
        [File | null, string, boolean, Throttle]
    >();
    private Initialized = 0;
    constructor(readonly prefix: string) {
        this.dir = path.join(getConfig().judger.tmpdirBase, prefix);
    }

    /**
     * must use init() after constructor
     * mkdir and download primaryFile
     */
    async init(): Promise<void> {
        await fs.promises.mkdir(this.dir, {
            recursive: true,
            mode: 0o700,
        });
        await chownR(this.dir, getConfig().judger.uid, getConfig().judger.gid);
        this.Initialized++;
    }

    private checkInit(): void {
        if (this.Initialized !== 1) {
            throw new Error("Don't forget to call init or init multiple times");
        }
    }

    register(name: string, subpath: string): void {
        this.checkInit();
        if (!path.isAbsolute(subpath)) {
            subpath = path.join(this.dir, subpath);
        }
        this.nameToFile.set(name, [null, subpath, true, new Throttle(1)]);
    }
    add(name: string, file: File, subpath?: string): PlatformPath {
        this.checkInit();
        if (subpath === undefined) {
            subpath = name;
        }
        subpath = path.join(this.dir, subpath);
        this.nameToFile.set(name, [file, subpath, false, new Throttle(1)]);
        return path;
    }
    async getStream(name: string): Promise<Readable> {
        this.checkInit();
        const s = fs.createReadStream(await this.getPath(name));
        await waitForOpen(s);
        return s;
    }
    /** @deprecated  no auto close fd */
    async getFd(name: string): Promise<number> {
        this.checkInit();
        const s = fs.openSync(await this.getPath(name), "r");
        return s;
    }
    async getFileHandler(name: string): Promise<FileHandle> {
        this.checkInit();
        const s = await fs.promises.open(await this.getPath(name), "r");
        return s;
    }
    async getPath(name: string): Promise<string> {
        this.checkInit();
        let record = this.nameToFile.get(name);
        if (record !== undefined) {
            const [file, subpath, , throttle] = record;
            let [, , writed] = record;
            if (writed === true) {
                return subpath;
            }
            return throttle.withThrottle(async () => {
                record = this.nameToFile.get(name);
                if (record === undefined) {
                    throw new Error("Unreachable code");
                }
                [, , writed] = record;
                if (writed === true) {
                    return subpath;
                }
                if (file === null) {
                    throw new Error("File not found, unreachable code");
                }
                await fs.promises.mkdir(path.dirname(subpath), {
                    recursive: true,
                    mode: 0o700,
                });
                await fs.promises.chown(
                    path.dirname(subpath),
                    getConfig().judger.uid,
                    getConfig().judger.gid
                ); // maybe not enough
                await pipeline(
                    await readableFromFile(file),
                    fs.createWriteStream(subpath, {
                        mode: 0o700,
                    })
                );
                await fs.promises.chown(
                    subpath,
                    getConfig().judger.uid,
                    getConfig().judger.gid
                );
                this.nameToFile.set(name, [file, subpath, true, throttle]);
                return subpath;
            });
        } else {
            throw new Error("File not add or register");
        }
    }
    async clean(): Promise<void> {
        return await fs.promises.rmdir(this.dir, { recursive: true });
    }
}
