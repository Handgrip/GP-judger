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
