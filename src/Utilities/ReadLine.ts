import { Writable } from "stream";

// may replaced by node:readline/promise node:17
export class ReadLine extends Writable {
    closed?: boolean;
    errored?: boolean;
    lines: string[] = [];
    lastline: string | undefined = undefined;
    consumer:
        | [
              (value: string | PromiseLike<string>) => void,
              (reason?: any) => void
          ]
        | undefined = undefined;
    producer: ((value: void | PromiseLike<void>) => void) | undefined;
    constructor() {
        super({
            decodeStrings: false,
        });
        if (!("closed" in this)) {
            this.on("close", () => {
                this.closed = true;
            });
        }
        if (!("errored" in this)) {
            this.on("error", (err) => {
                this.errored = true;
            });
        }
    }
    _write(
        chunk: any,
        encoding: BufferEncoding,
        callback: (error?: Error | null | undefined) => void
    ): void {
        this._solve(chunk)
            .then(() => callback(null))
            .catch(callback);
    }

    async _solve(chunk: string | Buffer): Promise<void> {
        if (chunk instanceof Buffer) {
            chunk = chunk.toString("utf-8");
        }
        if (this.lastline) {
            chunk = this.lastline + chunk;
            this.lastline = undefined;
        }
        const ls = chunk.split(/\r?\n/g);
        const last = ls.pop();
        if (typeof last === "string" || last !== "") {
            this.lastline = last;
        }
        for (const line of ls) {
            if (this.lines.length > 1000) {
                throw new Error("too many lines");
            }
            if (this.consumer) {
                this.consumer[0](line);
                this.consumer = undefined;
            } else {
                this.lines.push(line);
            }
        }
        if (ls.length === 0) {
            if (this.lastline && this.lastline.length > 1 * 1024 * 1024) {
                throw new Error("too long line");
            }
        } else {
            await new Promise((resolve) => {
                this.producer = resolve;
            });
        }
    }
    _final(callback: (error?: Error | null | undefined) => void): void {
        if (this.consumer) {
            this.consumer[1](new Error("stream close"));
            this.consumer = undefined;
        }
        if (this.producer) {
            this.producer();
            this.producer = undefined;
        }
        this.lastline = undefined;
        this.lines = [];
        callback();
    }
    async getLine() {
        if (this.closed || this.errored || this.destroyed) {
            throw new Error("stream status error");
        }
        let line = this.lines.shift();
        if (line === undefined) {
            if (this.producer) this.producer();
            line = await new Promise<string>((resolve, reject) => {
                this.consumer = [resolve, reject];
            });
        }
        return line;
    }
}
