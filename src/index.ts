import "reflect-metadata";
import { configure, getLogger } from "log4js";
import version from "./version";
import { getConfig } from "./Config";
import { getgid, getuid } from "process";
import { God } from "./God";

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
}

main();
