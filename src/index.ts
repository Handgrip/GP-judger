import "reflect-metadata";
import { configure, getLogger } from "log4js";
import version from "./version";
import { getConfig } from "./Config";
import { getgid, getuid } from "process";
import { God } from "./God";
import express from "express";
import { Throttle } from "./Utilities/Throttle";
import { GameResult, Task } from "./decl";

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function main() {
    if (!(getuid && getuid() == 0 && getgid && getgid() == 0)) {
        throw new Error("Please run with root");
    }
    configure({
        appenders: {
            cheese: {
                type: "file",
                filename: "cheese.log",
                maxLogSize: "10M",
                backups: 5,
            },
            console: { type: "console" },
        },
        categories: {
            default: { appenders: ["cheese", "console"], level: "info" },
        },
    });
    const logger = getLogger("main");
    logger.info("Lunched");
    logger.info(version);
    try {
        getConfig();
    } catch (e) {
        logger.fatal(e);
        await wait(2000);
        throw e;
    }
    // console.log(JSON.stringify(await new God({}).getResult()));
    const throttle = new Throttle(getConfig().self.judgeCapability);
    const stat = {
        total: 0,
        solved: 0,
        error: 0,
    };

    const app = express();
    app.use(express.json({ limit: "20mb" }));
    app.post("/v1/judge", async (req, res) => {
        res.status(200).end();
        if (req.ip !== getConfig().self.trustIp) {
            return;
        }
        stat.total++;
        const task: Task = req.body;
        try {
            await throttle.withThrottle(async () => {
                await new God(task.game, task.callback).start();
            });
        } catch (err) {
            stat.error++;
            logger.error(err);
        } finally {
            stat.solved++;
        }
    });
    app.get("/v1/stat", async (req, res) => {
        res.status(200).json(stat);
    });
    app.listen(getConfig().self.port, getConfig().self.host, () => {
        logger.info(
            `express start at ${getConfig().self.host}:${getConfig().self.port}`
        );
    });
}

main();
