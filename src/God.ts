import { DockerProcess } from "./Spawn/Process";
import { getline } from "./Utilities/util";
import { FromJudger, Game } from "./decl";

export class God {
    constructor(private readonly Codes: Game) {}
    async getResult() {
        // complie

        // run

        const processDict: Partial<Record<string, DockerProcess>> = {};

        try {
            const judger = processDict["judger"];
            if (!judger || !judger.stdout || !judger.stdin) {
                throw new Error("unreachable");
            }
            for (;;) {
                const fromJudger: FromJudger = JSON.parse(
                    await getline(judger.stdout)
                );
                if (fromJudger.command === "finish") {
                } else {
                    for (const key in fromJudger.content) {
                        if (Object.keys(processDict).includes(key)) {
                            const gamer = processDict[key];
                            if (!gamer || !gamer.stdin || !gamer.stdout) {
                                throw new Error(`gamer ${key} stdio error`);
                            }
                            gamer.stdin.write(fromJudger.content[key]);
                            const raw = getline(gamer.stdout);
                        } else {
                            throw new Error("judger give invaild gamer id");
                        }
                    }
                }
            }
        } catch (err) {
            for (const key in processDict) {
                const process = processDict[key];
                if (process) {
                    process.clean();
                }
            }
        }
    }
}
