import "reflect-metadata";
import { configure, getLogger } from "log4js";
import { getConfig } from "./Config";
import { getgid, getuid } from "process";
import version from "./version";

async function wait(ms: number) {
    return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

async function main() {
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
    if (getuid() || getgid()) {
        throw new Error("Please run with root");
    }
}

main();
