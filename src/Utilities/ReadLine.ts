import { Writable } from "stream";

export class ReadLine extends Writable {
    lines: string[] = [];
    lastline: string = "";
    consumers: [
        (value: string | PromiseLike<string>) => void,
        (reason?: any) => void
    ][] = [];
    producer: ((value: void | PromiseLike<void>) => void) | undefined;
    constructor() {
        super({
            decodeStrings: false,
        });
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
        for (const line of chunk.split(/\r?\n|\r|\n/g)) {
            
        }
        
        
    }
    async getLine() {
        let line = this.lines.shift();
        if (!line) {
            if (this.producer) this.producer();
            line = await new Promise<string>((resolve, reject) => {
                this.consumers.push([resolve, reject]);
            });
        }
        return line;
    }
}
