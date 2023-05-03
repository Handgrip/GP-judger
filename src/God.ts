import axios from "axios";
import { DockerProcess } from "./Spawn/Process";
import { ExecutableAgent } from "./Utilities/ExecutableAgent";
import { ReadLine } from "./Utilities/ReadLine";
import { timeout } from "./Utilities/util";
import {
    Callback,
    CompileSingleResult,
    FromJudger,
    Game,
    GameResult,
    GamerRoundSummary,
    JudgerRoundSummary,
    Limit,
    ToJudger,
    Usage,
    Verdict,
} from "./decl";
import { getLogger } from "log4js";
import { retry } from "./Utilities/File";
const logger = getLogger(`God`);

export function generateVerdict(
    limit: Limit,
    usage: Usage,
    lastUsage: Usage | null,
    exitCode: number | null
): Verdict {
    if (usage.memory > limit.memory) {
        return "MLE";
    }

    let lastTime = 0;
    if (lastUsage) {
        lastTime = lastUsage.time.usr + lastUsage.time.sys;
    }
    if (usage.time.usr + usage.time.sys - lastTime > limit.time) return "TLE";

    if (exitCode !== null) {
        if (exitCode !== 0) {
            return "RE";
        } else {
            return "NR";
        }
    }

    return "OK";
}

export class God {
    constructor(
        private readonly codes: Game,
        private readonly callback: Callback
    ) {}
    async start(): Promise<void> {
        const executableDict: Record<string, ExecutableAgent> = {};
        const compileResult: Record<string, CompileSingleResult> = {};
        const processDict: Record<string, DockerProcess> = {};
        const readlineDict: Record<string, ReadLine> = {};
        const roundSummary: (JudgerRoundSummary | GamerRoundSummary)[] = [];
        const gamerVerdict: Record<string, Verdict> = {};

        try {
            // complie
            this.updateStatus(1);
            for (const key in this.codes) {
                const agent = new ExecutableAgent(this.codes[key]);
                await agent.init();
                executableDict[key] = agent;
                const result = await agent.compile();
                if (result) {
                    compileResult[key] = result;
                    if (result.verdict !== "OK") {
                        throw new Error("compile failed");
                    }
                }
            }

            // run
            this.updateStatus(2);
            for (const key in executableDict) {
                const agent = executableDict[key];
                const process = await agent.exec();
                processDict[key] = process;
                const out = process.stdout;
                if (out != null) {
                    const rl = new ReadLine();
                    out.pipe(rl);
                    readlineDict[key] = rl;
                }
            }
            for (let toJudger: ToJudger = {}, roundCount = 1; ; roundCount++) {
                const judger = processDict["judger"];
                const judgerRl = readlineDict["judger"];
                let fromJudger: FromJudger = {
                    command: "finish",
                    content: {},
                    display: "",
                };
                try {
                    if (
                        !judger ||
                        !judgerRl ||
                        !judger.stdout ||
                        !judger.stdin
                    ) {
                        throw new Error("judger status error");
                    }
                    const cancel = timeout(
                        judger,
                        this.codes["judger"].limit.time
                    );
                    await judger.cont();
                    if (roundCount > 1) {
                        judger.stdin.write(JSON.stringify(toJudger) + "\n");
                    }
                    fromJudger = JSON.parse(await judgerRl.getLine());
                    await judger.stop();
                    cancel();

                    // validate, may use class-vaildator
                    if (
                        !(
                            typeof fromJudger.display === "string" &&
                            typeof fromJudger.content === "object" &&
                            ((fromJudger.command === "finish" &&
                                Object.values(fromJudger.content).every(
                                    (v) => typeof v === "number"
                                )) ||
                                (fromJudger.command === "request" &&
                                    Object.values(fromJudger.content).every(
                                        (v) => typeof v === "string"
                                    )))
                        )
                    ) {
                        throw new Error("NJ");
                    }
                } catch (err) {
                    logger.error(err);
                    await judger.terminal();
                    throw err;
                } finally {
                    const [usage, lastUsage] = await judger.measureAndLast();
                    const verdict = generateVerdict(
                        this.codes["judger"].limit,
                        usage,
                        lastUsage ?? null,
                        judger.exitCode
                    );
                    const judgerSummary: JudgerRoundSummary = {
                        output: fromJudger,
                        ...usage,
                        verdict: verdict,
                    };
                    roundSummary.push(judgerSummary);
                    if (fromJudger.command === "finish") {
                        break;
                    }
                    if (verdict !== "OK") {
                        await judger.terminal();
                        throw new Error("judger verdict error");
                    }
                }

                if (fromJudger.command === "request") {
                    if (roundCount >= 100) {
                        throw new Error("too much round");
                    }
                    toJudger = {};
                    const gamerSummary: GamerRoundSummary = {};
                    for (const key in fromJudger.content) {
                        if (
                            processDict[key] &&
                            gamerVerdict[key] === undefined
                        ) {
                            const gamer = processDict[key];
                            const gamerRl = readlineDict[key];
                            let raw = "";
                            try {
                                if (
                                    !gamer ||
                                    !gamerRl ||
                                    !gamer.stdin ||
                                    !gamer.stdout
                                ) {
                                    throw new Error(
                                        `gamer ${key} status error`
                                    );
                                }
                                let s = fromJudger.content[key] as string;
                                s += "\n";
                                const cancel = timeout(
                                    gamer,
                                    this.codes[key].limit.time
                                );
                                await gamer.cont();
                                gamer.stdin.write(s);
                                raw = await gamerRl.getLine();
                                await gamer.stop();
                                cancel();
                            } catch (err) {
                                logger.error(err);
                                await gamer.terminal();
                            } finally {
                                const [usage, lastUsage] =
                                    await gamer.measureAndLast();
                                const verdict = generateVerdict(
                                    this.codes[key].limit,
                                    usage,
                                    lastUsage ?? null,
                                    gamer.exitCode
                                );
                                toJudger[key] = {
                                    verdict: verdict,
                                    raw: raw,
                                };
                                gamerSummary[key] = {
                                    ...usage,
                                    ...toJudger[key],
                                };
                                if (verdict !== "OK") {
                                    gamerVerdict[key] = verdict;
                                    await gamer.terminal();
                                }
                            }
                        } else {
                            throw new Error(
                                `judger give invaild gamer id: ${key}`
                            );
                        }
                    }
                    roundSummary.push(gamerSummary);
                }
            }
        } catch (err) {
            logger.error(err);
        } finally {
            for (const key in processDict) {
                const process = processDict[key];
                if (process) {
                    await process.clean();
                }
            }
            for (const key in executableDict) {
                await executableDict[key].clean();
            }
        }
        this.updateResult({
            complie: compileResult,
            round: roundSummary,
        });
    }

    async updateStatus(status: number) {
        try {
            await retry(async () => {
                await axios.post(this.callback.update, {
                    status: status,
                });
            }, 3);
        } catch (err) {
            logger.error(err);
        }
    }

    async updateResult(result: GameResult) {
        try {
            await retry(async () => {
                await axios.post(this.callback.finish, {
                    result: JSON.stringify(result),
                });
            }, 3);
        } catch (err) {
            logger.error(err);
        }
    }
}
