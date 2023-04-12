import { Readable } from "stream";
import { StringDecoder } from "string_decoder";

export async function backOff<T>(
    fun: () => Promise<T>,
    maxMs?: number
): Promise<T> {
    let interval = 10;
    for (;;) {
        try {
            return await fun();
        } catch (error) {
            if (!maxMs || interval <= maxMs) {
                await delay(interval);
                interval = interval * 2;
            } else throw error;
        }
    }
}
export function delay(ms: number): Promise<number> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(0), ms);
    });
}
export function getline(stream: Readable) {
    return new Promise<string>((resolve, reject) => {
        const callback = (err: Error) => reject(err);
        const onReadable = () => {
            let chunk;
            let line = "";
            const decoder = new StringDecoder("utf-8");
            while (null !== (chunk = stream.read())) {
                const str = decoder.write(chunk);
                const idx = str.search(/\r?\n/);
                if (idx != -1) {
                    line += str.substring(0, idx);
                    const remaining = str.substring(
                        idx + str.charAt(idx) === "\r" ? 2 : 1
                    );
                    const buf = Buffer.from(remaining, "utf-8");
                    stream.removeListener("error", callback);
                    stream.removeListener("readable", onReadable);
                    if (buf.length) stream.unshift(buf);
                    resolve(line);
                    return;
                }
                line += str;
                if (line.length > 1 * 1024 * 1024) {
                    reject(new Error("line too long"));
                    stream.destroy();
                }
            }
        };
        stream.on("error", callback);
        stream.on("readable", onReadable);
    });
}
