import "reflect-metadata";
import { configure, getLogger } from "log4js";
import version from "./version";
import { getConfig } from "./Config";
import { getgid, getuid } from "process";
import { God } from "./God";
// const why = require("why-is-node-running");

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
    if (!(getuid && getuid() == 0 && getgid && getgid() == 0)) {
        throw new Error("Please run with root");
    }
    console.log(
        JSON.stringify(
            await new God({
                judger: {
                    language: "cpp",
                    limit: { time: 1000, memory: 1024 * 1024 * 1024 },
                    source: `#include <bits/stdc++.h>

                    using namespace std;
                    
                    int main(void) {
                      cout
                          << R"({"command":"request","display":"round1","content":{"0":"0","1":"1"}})"
                          << endl;
                      string s;
                      for (int i = 1; i < 500; i++) {
                        getline(cin, s);
                        s="1";
                        cout << R"({"command":"request","display":")" + s +
                                    R"(","content":{"0":"0","1":"1"}})"
                             << endl;
                      }
                      getline(cin, s);
                    
                      cout << R"({"command":"finish","display":"round1","content":{"0":0,"1":0}})"
                           << endl;
                    }`,
                },
                "0": {
                    language: "cpp",
                    limit: { time: 1000, memory: 1024 * 1024 * 1024 },
                    source: `#include <stdio.h>

                    int main()
                    {
                        char c;
                        while ((c=getchar())!=EOF){
                            putchar(c);
                            fflush(stdout);
                        }
                        return 0;
                    }`,
                },
                "1": {
                    language: "cpp",
                    limit: { time: 1000, memory: 1024 * 1024 * 1024 },
                    source: `#include <stdio.h>

                    int main()
                    {
                        char c;
                        while ((c=getchar())!=EOF){
                            putchar(c);
                            fflush(stdout);
                        }
                        return 0;
                    }`,
                },
            }).getResult()
        )
    );
    // why();
}

main();
