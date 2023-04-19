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
                    language: "js",
                    limit: { time: 1000, memory: 1024 * 1024 * 1024 },
                    source: `const readline = require("readline/promises");
                    const communication = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    
                    const map = Array.from(new Array(15), () => new Array(15).fill(-1));
                    
                    function isOk(x, y) {
                        return x >= 0 && x <= 14 && y >= 0 && y <= 14 && map[x][y] === -1;
                    }
                    
                    function isEnd() {
                        let cnt = [0, 0];
                        function solve(i, j) {
                            if (map[i][j] === -1) {
                                cnt[0] = cnt[1] = 0;
                            } else {
                                cnt[map[i][j]]++;
                            }
                            if (cnt[0] >= 5 || cnt[1] >= 5) {
                                return true;
                            }
                            return false;
                        }
                        for (let i = 0; i <= 14; i++) {
                            for (let j = 0; j <= 14; j++) {
                                if (solve(i, j)) {
                                    return true;
                                }
                            }
                        }
                    
                        cnt = [0, 0];
                        for (let j = 0; j <= 14; j++) {
                            for (let i = 0; i <= 14; i++) {
                                if (solve(i, j)) {
                                    return true;
                                }
                            }
                        }
                    
                        for (let sm = 0; sm <= 28; sm++) {
                            cnt = [0, 0];
                            for (let i = 0; i <= 14; i++) {
                                let j = sm - i;
                                if (!(j >= 0 && j <= 14)) {
                                    continue;
                                }
                                if (solve(i, j)) {
                                    return true;
                                }
                            }
                        }
                    
                        for (let d = -14; d <= 14; d++) {
                            cnt = [0, 0];
                            for (let i = 0; i <= 14; i++) {
                                let j = i + d;
                                if (!(j >= 0 && j <= 14)) {
                                    continue;
                                }
                                if (solve(i, j)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    }
                    
                    let curGamer = 0,
                        x = -1,
                        y = -1;
                    
                    function gamerWin(gamerNo, reason) {
                        const content = {};
                        Reflect.set(content, String(gamerNo & 1), 1);
                        Reflect.set(content, String((gamerNo & 1) ^ 1), 0);
                    
                        console.log(
                            JSON.stringify({
                                command: "finish",
                                display: JSON.stringify({
                                    gamer: curGamer,
                                    x,
                                    y,
                                    winner: gamerNo,
                                    reason,
                                    map,
                                }),
                                content: content,
                            })
                        );
                    }
                    
                    function gamerRequest(gamerNo, request) {
                        const content = {};
                        Reflect.set(content, String(gamerNo & 1), String(request));
                    
                        console.log(
                            JSON.stringify({
                                command: "request",
                                display: JSON.stringify({ gamer: curGamer, x, y }),
                                content: content,
                            })
                        );
                    }
                    
                    async function bootstrap() {
                        gamerRequest(0, "-1 -1");
                    
                        for (let round = 0; ; round++) {
                            curGamer = round & 1;
                            x = y = -1;
                    
                            const result = JSON.parse(await communication.question(""));
                            const gamerOperation = result[String(curGamer)];
                            if (
                                !gamerOperation ||
                                gamerOperation.verdict !== "OK" ||
                                typeof gamerOperation.raw !== "string"
                            ) {
                                gamerWin(curGamer ^ 1, "对手不堪重负");
                                break;
                            }
                            [x, y] = String(gamerOperation.raw)
                                .split(" ")
                                .map((s) => parseInt(s));
                            if (!Number.isInteger(x)) x = 0;
                            if (!Number.isInteger(y)) y = 0;
                            if (!isOk(x, y)) {
                                gamerWin(curGamer ^ 1, "对手落点违规");
                                break;
                            }
                            map[x][y] = curGamer;
                            if (isEnd()) {
                                gamerWin(curGamer, "五子连珠");
                                break;
                            }
                            gamerRequest(curGamer ^ 1, \`\${x} \${y}\`);
                        }
                    }
                    
                    bootstrap().finally(() => {
                        communication.close();
                    });
                    `,
                },
                "0": {
                    language: "cpp",
                    limit: { time: 1000, memory: 1024 * 1024 * 1024 },
                    source: `#include <bitset>
                    #include <iostream>
                    #define btst std::bitset
                    #define cn std::cin
                    #define ct std::cout
                    #define endl std::endl
                    #define board(i) 0 <= i &&i < SIZE
                    #define str std::string
                    const short SIZE = 15, whole = 225;
                    short D[3] = {-1, 0, 1}, Grid[SIZE][SIZE] = {};
                    int main() {
                      short turnID = 0;
                      while (true) {
                        int oi, oj;
                        scanf("%d%d", &oi, &oj);
                        if (oi != -1 && oj != -1)
                          Grid[oi][oj] = -1;
                        if (turnID == 0) {
                          int i = 7, j = 7;
                          if (Grid[7][7])
                            j = 8;
                          ct << i << ' ' << j << endl;
                          Grid[i][j] = 1;
                          turnID++;
                          continue;
                        }
                        for (short k = 4; k >= 0; k--)
                          for (short i = 0; i < SIZE; i++)
                            for (short j = 0; j < SIZE; j++)
                              for (short o = 0; o < 3; o++)
                                for (short p = 0; p < 3; p++)
                                  if (o * p != 1 && board(i + k * D[o]) && board(j + k * D[p])) {
                                    if (Grid[i][j])
                                      continue;
                                    bool sign = true;
                                    for (short l = 1; l <= k; l++)
                                      if (Grid[i + l * D[o]][j + l * D[p]] != 1) {
                                        sign = false;
                                        break;
                                      }
                                    if (sign) {
                                      ct << i << ' ' << j << endl;
                                      Grid[i][j] = 1;
                                      goto ed;
                                    }
                                  }
                      ed:;
                      }
                    
                      return 0;
                    }`,
                },
                "1": {
                    language: "cpp",
                    limit: { time: 1000, memory: 1024 * 1024 * 1024 },
                    source: `// gomokubot.cpp : This file contains the 'main' function. Program execution
                    // begins and ends there.
                    //
                    
                    // #include "pch.h"
                    #include <iostream>
                    // #include <math.h>
                    #define min(a, b) (((a) < (b)) ? (a) : (b))
                    #define max(a, b) (((a) > (b)) ? (a) : (b))
                    #include <string.h>
                    
                    int gvab(char *chbm);
                    int gvaw(char *chbm);
                    int cho(int *chbt, char *chbm, int turn, int rt, int depth, int expect);
                    void uchbm(int *chbt, char *chbm, int posx, int posy, int turn);
                    int chop(int *chbt, char *chbm, int turn, int depth);
                    
                    double w[8192];
                    int chb[225];
                    int step, flag = 59997400;
                    int steppos[255];
                    char chbmstep[900];
                    int hsn;
                    int reccount;
                    int another, anox, anoy, mode, aut;
                    
                    int nx[8] = {1, 1, 0, -1, -1, -1, 0, 1};
                    int ny[8] = {0, -1, -1, -1, 0, 1, 1, 1};
                    const int valmapb[31] = {0,       0,       2,      4,    0,   4,      35,
                                             0,       15,      300,    0,    600, 100000, 200000,
                                             200000,  200000,  0,      -1,   -2,  0,      -2,
                                             -15,     0,       -10,    -100, 0,   -200,   -1000,
                                             -200000, -200000, -200000};
                    const int valmapw[31] = {
                        0,    0,      1,      2,       0,       2,       15,     0, 10, 100, 0, 200,
                        1000, 200000, 200000, 200000,  0,       -2,      -4,     0, -4, -35, 0, -15,
                        -300, 0,      -600,   -100000, -200000, -200000, -200000};
                    const int valmapwa[31] = {
                        0,    0,   2,    4,     0,        8,        70,      0,
                        45,   900, 0,    24000, 400000,   1000000,  1000000, 1000000,
                        0,    -1,  -2,   0,     -4,       -30,      0,       -30,
                        -300, 0,   -800, -4000, -1000000, -1000000, -1000000};
                    const int valmapba[31] = {
                        0,    0,   1,     2,       0,        4,        30,      0,
                        30,   300, 0,     800,     4000,     1000000,  1000000, 1000000,
                        0,    -2,  -4,    0,       -8,       -70,      0,       -45,
                        -900, 0,   -2400, -400000, -1000000, -1000000, -1000000};
                    
                    struct int2 {
                      int x, y;
                    };
                    
                    void uchbm(int *chbt, char *chbm, int posx, int posy, int turn) {
                      int i, j, x, y;
                      if (turn == 1) {
                        i = 0;
                        j = 3;
                        x = posx + 1;
                        y = posy + 0;
                        while (x < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 0]--;
                          x += 1;
                          y += 0;
                        }
                        x = posx - 1;
                        y = posy - 0;
                        while (x > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 0]--;
                          x -= 1;
                          y -= 0;
                        }
                        x = posx + 1;
                        y = posy + 0;
                        while (x < 15 && chbt[x * 15 + y] == 1) {
                          i++;
                          x += 1;
                          y += 0;
                        }
                        if (x == 15 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        x = posx - 1;
                        y = posy - 0;
                        while (x > -1 && chbt[x * 15 + y] == 1) {
                          i++;
                          x -= 1;
                          y -= 0;
                        }
                        if (x == -1 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + 1;
                        y = posy + 0;
                        while (x < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 0] = i;
                          x += 1;
                          y += 0;
                        }
                        x = posx - 1;
                        y = posy - 0;
                        while (x > 0 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 0] = i;
                          x -= 1;
                          y -= 0;
                        }
                        chbm[posx * 60 + posy * 4 + 0] = i;
                        i = 0;
                        j = 3;
                        x = posx + 1;
                        y = posy + -1;
                        while (x < 15 && y > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 1]--;
                          x += 1;
                          y += -1;
                        }
                        x = posx - 1;
                        y = posy - -1;
                        while (x > -1 && y < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 1]--;
                          x -= 1;
                          y -= -1;
                        }
                        x = posx + 1;
                        y = posy + -1;
                        while (x < 15 && y > -1 && chbt[x * 15 + y] == 1) {
                          i++;
                          x += 1;
                          y += -1;
                        }
                        if (x == 15 || y == -1 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        x = posx - 1;
                        y = posy - -1;
                        while (x > -1 && y < 15 && chbt[x * 15 + y] == 1) {
                          i++;
                          x -= 1;
                          y -= -1;
                        }
                        if (x == -1 || y == 15 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + 1;
                        y = posy + -1;
                        while (x < 15 && y > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 1] = i;
                          x += 1;
                          y += -1;
                        }
                        x = posx - 1;
                        y = posy - -1;
                        while (x > -1 && y < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 1] = i;
                          x -= 1;
                          y -= -1;
                        }
                        chbm[posx * 60 + posy * 4 + 1] = i;
                        i = 0;
                        j = 3;
                        x = posx + 0;
                        y = posy + -1;
                        while (y > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 2]--;
                          x += 0;
                          y += -1;
                        }
                        x = posx - 0;
                        y = posy - -1;
                        while (y < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 2]--;
                          x -= 0;
                          y -= -1;
                        }
                        x = posx + 0;
                        y = posy + -1;
                        while (y > -1 && chbt[x * 15 + y] == 1) {
                          i++;
                          x += 0;
                          y += -1;
                        }
                        if (y == -1 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        x = posx - 0;
                        y = posy - -1;
                        while (y < 15 && chbt[x * 15 + y] == 1) {
                          i++;
                          x -= 0;
                          y -= -1;
                        }
                        if (y == 15 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + 0;
                        y = posy + -1;
                        while (y > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 2] = i;
                          x += 0;
                          y += -1;
                        }
                        x = posx - 0;
                        y = posy - -1;
                        while (y < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 2] = i;
                          x -= 0;
                          y -= -1;
                        }
                        chbm[posx * 60 + posy * 4 + 2] = i;
                        i = 0;
                        j = 3;
                        x = posx + -1;
                        y = posy + -1;
                        while (x > -1 && y > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 3]--;
                          x += -1;
                          y += -1;
                        }
                        x = posx - -1;
                        y = posy - -1;
                        while (x < 15 && y < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 3]--;
                          x -= -1;
                          y -= -1;
                        }
                        x = posx + -1;
                        y = posy + -1;
                        while (x > -1 && y > -1 && chbt[x * 15 + y] == 1) {
                          i++;
                          x += -1;
                          y += -1;
                        }
                        if (x == -1 || y == -1 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        x = posx - -1;
                        y = posy - -1;
                        while (x < 15 && y < 15 && x < 15 && y < 15 && chbt[x * 15 + y] == 1) {
                          i++;
                          x -= -1;
                          y -= -1;
                        }
                        if (x == 15 || y == 15 || chbt[x * 15 + y] == 2) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + -1;
                        y = posy + -1;
                        while (x > -1 && y > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 3] = i;
                          x += -1;
                          y += -1;
                        }
                        x = posx - -1;
                        y = posy - -1;
                        while (x < 15 && y < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 3] = i;
                          x -= -1;
                          y -= -1;
                        }
                        chbm[posx * 60 + posy * 4 + 3] = i;
                      } else {
                        i = 0;
                        j = 18;
                        x = posx + 1;
                        y = posy + 0;
                        while (x < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 0]--;
                          x += 1;
                          y += 0;
                        }
                        x = posx - 1;
                        y = posy - 0;
                        while (x > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 0]--;
                          x -= 1;
                          y -= 0;
                        }
                        x = posx + 1;
                        y = posy + 0;
                        while (x < 15 && chbt[x * 15 + y] == 2) {
                          i++;
                          x += 1;
                          y += 0;
                        }
                        if (x == 15 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        x = posx - 1;
                        y = posy - 0;
                        while (x > -1 && chbt[x * 15 + y] == 2) {
                          i++;
                          x -= 1;
                          y -= 0;
                        }
                        if (x == -1 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + 1;
                        y = posy + 0;
                        while (x < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 0] = i;
                          x += 1;
                          y += 0;
                        }
                        x = posx - 1;
                        y = posy - 0;
                        while (x > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 0] = i;
                          x -= 1;
                          y -= 0;
                        }
                        chbm[posx * 60 + posy * 4 + 0] = i;
                        i = 0;
                        j = 18;
                        x = posx + 1;
                        y = posy + -1;
                        while (x < 15 && y > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 1]--;
                          x += 1;
                          y += -1;
                        }
                        x = posx - 1;
                        y = posy - -1;
                        while (x > -1 && y < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 1]--;
                          x -= 1;
                          y -= -1;
                        }
                        x = posx + 1;
                        y = posy + -1;
                        while (x < 15 && y > -1 && chbt[x * 15 + y] == 2) {
                          i++;
                          x += 1;
                          y += -1;
                        }
                        if (x == 15 || y == -1 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        x = posx - 1;
                        y = posy - -1;
                        while (x > -1 && y < 15 && chbt[x * 15 + y] == 2) {
                          i++;
                          x -= 1;
                          y -= -1;
                        }
                        if (x == -1 || y == 15 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + 1;
                        y = posy + -1;
                        while (x < 15 && y > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 1] = i;
                          x += 1;
                          y += -1;
                        }
                        x = posx - 1;
                        y = posy - -1;
                        while (x > -1 && y < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 1] = i;
                          x -= 1;
                          y -= -1;
                        }
                        chbm[posx * 60 + posy * 4 + 1] = i;
                        i = 0;
                        j = 18;
                        x = posx + 0;
                        y = posy + -1;
                        while (y > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 2]--;
                          x += 0;
                          y += -1;
                        }
                        x = posx - 0;
                        y = posy - -1;
                        while (y < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 2]--;
                          x -= 0;
                          y -= -1;
                        }
                        x = posx + 0;
                        y = posy + -1;
                        while (y > -1 && chbt[x * 15 + y] == 2) {
                          i++;
                          x += 0;
                          y += -1;
                        }
                        if (y == -1 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        x = posx - 0;
                        y = posy - -1;
                        while (y < 15 && chbt[x * 15 + y] == 2) {
                          i++;
                          x -= 0;
                          y -= -1;
                        }
                        if (y == 15 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + 0;
                        y = posy + -1;
                        while (y > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 2] = i;
                          x += 0;
                          y += -1;
                        }
                        x = posx - 0;
                        y = posy - -1;
                        while (y < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 2] = i;
                          x -= 0;
                          y -= -1;
                        }
                        chbm[posx * 60 + posy * 4 + 2] = i;
                        i = 0;
                        j = 18;
                        x = posx + -1;
                        y = posy + -1;
                        while (x > -1 && y > -1 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 3]--;
                          x += -1;
                          y += -1;
                        }
                        x = posx - -1;
                        y = posy - -1;
                        while (x < 15 && y < 15 && chbt[x * 15 + y] == 1) {
                          chbm[x * 60 + y * 4 + 3]--;
                          x -= -1;
                          y -= -1;
                        }
                        x = posx + -1;
                        y = posy + -1;
                        while (x > -1 && y > -1 && chbt[x * 15 + y] == 2) {
                          i++;
                          x += -1;
                          y += -1;
                        }
                        if (x == -1 || y == -1 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        x = posx - -1;
                        y = posy - -1;
                        while (x < 15 && y < 15 && chbt[x * 15 + y] == 2) {
                          i++;
                          x -= -1;
                          y -= -1;
                        }
                        if (x == 15 || y == 15 || chbt[x * 15 + y] == 1) {
                          j--;
                        }
                        i = min(i, 4) * 3 + j;
                        x = posx + -1;
                        y = posy + -1;
                        while (x > -1 && y > -1 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 3] = i;
                          x += -1;
                          y += -1;
                        }
                        x = posx - -1;
                        y = posy - -1;
                        while (x < 15 && y < 15 && chbt[x * 15 + y] == 2) {
                          chbm[x * 60 + y * 4 + 3] = i;
                          x -= -1;
                          y -= -1;
                        }
                        chbm[posx * 60 + posy * 4 + 3] = i;
                      }
                    }
                    
                    void put(int x, int y) {
                      if (x > -1 && y > -1 && x < 15 && y < 15 && (!chb[y + x * 15])) {
                        uchbm(chb, chbmstep, x, y, (step - 1) % 2 + 1);
                        chb[y + x * 15] = (step - 1) % 2 + 1;
                        step++;
                      }
                    }
                    
                    void getjsonfirst(int2 &pos) {
                      int i, j;
                      scanf("%d%d", &i, &j);
                      pos.x = i, pos.y = j;
                    }
                    
                    void putjson(int2 pos) { printf("%d %d\\n", pos.x, pos.y);  fflush(stdout); }
                    
                    void getjson(int2 &pos) {
                      int i, j;
                      scanf("%d%d", &i, &j);
                      pos.x = i, pos.y = j;
                    }
                    
                    int gvaldivw(char *chbm, int *chbt, int x, int y) {
                      int v, p, mod1, mod2, mod3, mod4;
                      v = 0;
                      p = 15 * x + y;
                      mod1 = 18;
                      mod2 = 18;
                      mod3 = 18;
                      mod4 = 18;
                      if (x < 14) {
                        if (chbt[p + 15] == 1) {
                          v += valmapwa[chbm[p * 4 + 60] - 1] - valmapwa[chbm[p * 4 + 60]];
                          mod1--;
                        }
                        if (chbt[p + 15] == 2) {
                          v -= valmapwa[chbm[p * 4 + 60]];
                          mod1 += chbm[p * 4 + 60] - 15;
                        }
                        if (y < 14) {
                          if (chbt[p + 16] == 1) {
                            v += valmapwa[chbm[p * 4 + 67] - 1] - valmapwa[chbm[p * 4 + 67]];
                            mod4--;
                          }
                          if (chbt[p + 16] == 2) {
                            v -= valmapwa[chbm[p * 4 + 67]];
                            mod4 += chbm[p * 4 + 67] - 15;
                          }
                        } else {
                          mod4--;
                        }
                        if (y > 0) {
                          if (chbt[p + 14] == 1) {
                            v += valmapwa[chbm[p * 4 + 57] - 1] - valmapwa[chbm[p * 4 + 57]];
                            mod2--;
                          }
                          if (chbt[p + 14] == 2) {
                            v -= valmapwa[chbm[p * 4 + 57]];
                            mod2 += chbm[p * 4 + 57] - 15;
                          }
                        } else {
                          mod2--;
                        }
                      } else {
                        mod1--;
                        mod2--;
                        mod4--;
                      }
                      if (x > 0) {
                        if (chbt[p - 15] == 1) {
                          v += valmapwa[chbm[p * 4 - 60] - 1] - valmapwa[chbm[p * 4 - 60]];
                          mod1--;
                        }
                        if (chbt[p - 15] == 2) {
                          v -= valmapwa[chbm[p * 4 - 60]];
                          mod1 += chbm[p * 4 - 60] - 15;
                        }
                        if (y > 0) {
                          if (chbt[p - 16] == 1) {
                            v += valmapwa[chbm[p * 4 - 61] - 1] - valmapwa[chbm[p * 4 - 61]];
                            mod4--;
                          }
                          if (chbt[p - 16] == 2) {
                            v -= valmapwa[chbm[p * 4 - 61]];
                            mod4 += chbm[p * 4 - 61] - 15;
                          }
                        } else {
                          mod4--;
                        }
                        if (y < 14) {
                          if (chbt[p - 14] == 1) {
                            v += valmapwa[chbm[p * 4 - 55] - 1] - valmapwa[chbm[p * 4 - 55]];
                            mod2--;
                          }
                          if (chbt[p - 14] == 2) {
                            v -= valmapwa[chbm[p * 4 - 55]];
                            mod2 += chbm[p * 4 - 55] - 15;
                          }
                        } else {
                          mod2--;
                        }
                      } else {
                        mod1--;
                        mod2--;
                        mod4--;
                      }
                      if (y > 0) {
                        if (chbt[p - 1] == 1) {
                          v += valmapwa[chbm[p * 4 - 2] - 1] - valmapwa[chbm[p * 4 - 2]];
                          mod3--;
                        }
                        if (chbt[p - 1] == 2) {
                          v -= valmapwa[chbm[p * 4 - 2]];
                          mod3 += chbm[p * 4 - 2] - 15;
                        }
                      } else {
                        mod3--;
                      }
                      if (y < 14) {
                        if (chbt[p + 1] == 1) {
                          v += valmapwa[chbm[p * 4 + 6] - 1] - valmapwa[chbm[p * 4 + 6]];
                          mod3--;
                        }
                        if (chbt[p + 1] == 2) {
                          v -= valmapwa[chbm[p * 4 + 6]];
                          mod3 += chbm[p * 4 + 6] - 15;
                        }
                      } else {
                        mod3--;
                      }
                      while (mod1 > 30)
                        mod1 -= 3;
                      while (mod2 > 30)
                        mod2 -= 3;
                      while (mod3 > 30)
                        mod3 -= 3;
                      while (mod4 > 30)
                        mod4 -= 3;
                      v += valmapwa[mod1] + valmapwa[mod2] + valmapwa[mod3] + valmapwa[mod4];
                      return v;
                    }
                    
                    int gvaldivb(char *chbm, int *chbt, int x, int y) {
                      int v, p, mod1, mod2, mod3, mod4;
                      v = 0;
                      p = 15 * x + y;
                      mod1 = 3;
                      mod2 = 3;
                      mod3 = 3;
                      mod4 = 3;
                      if (x < 14) {
                        if (chbt[p + 15] == 2) {
                          v += valmapba[chbm[p * 4 + 60] - 1] - valmapba[chbm[p * 4 + 60]];
                          mod1--;
                        }
                        if (chbt[p + 15] == 1) {
                          v -= valmapba[chbm[p * 4 + 60]];
                          mod1 += chbm[p * 4 + 60];
                        }
                        if (y < 14) {
                          if (chbt[p + 16] == 2) {
                            v += valmapba[chbm[p * 4 + 67] - 1] - valmapba[chbm[p * 4 + 67]];
                            mod4--;
                          }
                          if (chbt[p + 16] == 1) {
                            v -= valmapba[chbm[p * 4 + 67]];
                            mod4 += chbm[p * 4 + 67];
                          }
                        } else {
                          mod4--;
                        }
                        if (y > 0) {
                          if (chbt[p + 14] == 2) {
                            v += valmapba[chbm[p * 4 + 57] - 1] - valmapba[chbm[p * 4 + 57]];
                            mod2--;
                          }
                          if (chbt[p + 14] == 1) {
                            v -= valmapba[chbm[p * 4 + 57]];
                            mod2 += chbm[p * 4 + 57];
                          }
                        } else {
                          mod2--;
                        }
                      } else {
                        mod1--;
                        mod2--;
                        mod4--;
                      }
                      if (x > 0) {
                        if (chbt[p - 15] == 2) {
                          v += valmapba[chbm[p * 4 - 60] - 1] - valmapba[chbm[p * 4 - 60]];
                          mod1--;
                        }
                        if (chbt[p - 15] == 1) {
                          v -= valmapba[chbm[p * 4 - 60]];
                          mod1 += chbm[p * 4 - 60];
                        }
                        if (y > 0) {
                          if (chbt[p - 16] == 2) {
                            v += valmapba[chbm[p * 4 - 61] - 1] - valmapba[chbm[p * 4 - 61]];
                            mod4--;
                          }
                          if (chbt[p - 16] == 1) {
                            v -= valmapba[chbm[p * 4 - 61]];
                            mod4 += chbm[p * 4 - 61];
                          }
                        } else {
                          mod4--;
                        }
                        if (y < 14) {
                          if (chbt[p - 14] == 2) {
                            v += valmapba[chbm[p * 4 - 55] - 1] - valmapba[chbm[p * 4 - 55]];
                            mod2--;
                          }
                          if (chbt[p - 14] == 1) {
                            v -= valmapba[chbm[p * 4 - 55]];
                            mod2 += chbm[p * 4 - 55];
                          }
                        } else {
                          mod2--;
                        }
                      } else {
                        mod1--;
                        mod2--;
                        mod4--;
                      }
                      if (y > 0) {
                        if (chbt[p - 1] == 2) {
                          v += valmapba[chbm[p * 4 - 2] - 1] - valmapba[chbm[p * 4 - 2]];
                          mod3--;
                        }
                        if (chbt[p - 1] == 1) {
                          v -= valmapba[chbm[p * 4 - 2]];
                          mod3 += chbm[p * 4 - 2];
                        }
                      } else {
                        mod3--;
                      }
                      if (y < 14) {
                        if (chbt[p + 1] == 2) {
                          v += valmapba[chbm[p * 4 + 6] - 1] - valmapba[chbm[p * 4 + 6]];
                          mod3--;
                        }
                        if (chbt[p + 1] == 1) {
                          v -= valmapba[chbm[p * 4 + 6]];
                          mod3 += chbm[p * 4 + 6];
                        }
                      } else {
                        mod3--;
                      }
                      while (mod1 > 15)
                        mod1 -= 3;
                      while (mod2 > 15)
                        mod2 -= 3;
                      while (mod3 > 15)
                        mod3 -= 3;
                      while (mod4 > 15)
                        mod4 -= 3;
                      v += valmapba[mod1] + valmapba[mod2] + valmapba[mod3] + valmapba[mod4];
                      return v;
                    }
                    
                    int gvab(char *chbm) {
                      int i, j;
                      j = 0;
                      for (i = 0; i < 900; i++) {
                        j += valmapb[chbm[i]];
                      }
                      return j;
                    }
                    
                    int gvaw(char *chbm) {
                      int i, j;
                      j = 0;
                      for (i = 0; i < 900; i++) {
                        j += valmapw[chbm[i]];
                      }
                      return j;
                    }
                    
                    int chop(int *chbt, char *chbm, int turn, int depth) {
                      int *pval, i, j, k, **pord, *pt, v, vt, p;
                      char *tchbm;
                      int zero;
                      if (step == 0) {
                        step = 1;
                        return 112;
                      }
                      if (step == 1) {
                        return 112;
                      }
                      zero = (turn == 1) ? -10000000 : 10000000;
                      tchbm = (char *)malloc(900);
                      pval = (int *)malloc(900);
                      pord = (int **)malloc(225 * sizeof(int *));
                      for (i = 0; i < 225; i++) {
                        if (!chbt[i]) {
                          if (turn == 1) {
                            pval[i] = gvaldivb(chbm, chbt, i / 15, i % 15) -
                                      0.01 * gvaldivw(chbm, chbt, i / 15, i % 15);
                          } else {
                            pval[i] = gvaldivw(chbm, chbt, i / 15, i % 15) -
                                      0.01 * gvaldivb(chbm, chbt, i / 15, i % 15);
                          }
                          pord[i] = pval + i;
                        } else {
                          pord[i] = &zero;
                        }
                      }
                      if (turn == 1) {
                        for (i = 0; i < 50 + step / 5; i++) {
                          for (j = i + 1; j < 225; j++) {
                            if (*pord[i] < *pord[j]) {
                              pt = pord[i];
                              pord[i] = pord[j];
                              pord[j] = pt;
                            }
                          }
                        }
                      } else {
                        for (i = 0; i < 50 + step / 5; i++) {
                          for (j = i + 1; j < 225; j++) {
                            if (*pord[i] > *pord[j]) {
                              pt = pord[i];
                              pord[i] = pord[j];
                              pord[j] = pt;
                            }
                          }
                        }
                      }
                      i = 0;
                      k = 0;
                      if (*pord[k] > 600000 || *pord[k] < -600000) {
                        p = pord[k] - pval;
                        free(tchbm);
                        free(pval);
                        free(pord);
                        return p;
                      }
                      j = pord[k] - pval;
                      p = j;
                      memcpy(tchbm, chbm, 900);
                      uchbm(chbt, tchbm, j / 15, j % 15, turn);
                      chbt[j] = turn;
                      v = cho(chbt, tchbm, 3 - turn, turn, depth - 1, zero);
                      chbt[j] = 0;
                      for (k = 1; i < 20 + step / 10, k < 50 + step / 5; k++) {
                        if (*pord[k] != *pord[k - 1]) {
                          i++;
                        }
                        if (*pord[k] == zero) {
                          break;
                        }
                        j = pord[k] - pval;
                        memcpy(tchbm, chbm, 900);
                        uchbm(chbt, tchbm, j / 15, j % 15, turn);
                        chbt[j] = turn;
                        vt = cho(chbt, tchbm, 3 - turn, turn, depth - 1, v);
                        chbt[j] = 0;
                        if (turn == 1) {
                          if (vt > v) {
                            v = vt;
                            p = j;
                          }
                        } else {
                          if (vt < v) {
                            v = vt;
                            p = j;
                          }
                        }
                      }
                      free(tchbm);
                      free(pval);
                      free(pord);
                      return p;
                    }
                    
                    int cho(int *chbt, char *chbm, int turn, int rt, int depth, int expect) {
                      int *pval, i, j, k, **pord, *pt, v, vt;
                      char *tchbm;
                      int zero;
                      zero = (turn == 1) ? -10000000 : 10000000;
                      tchbm = (char *)malloc(900);
                      pval = (int *)malloc(900);
                      pord = (int **)malloc(225 * sizeof(int *));
                      if (depth < 0) {
                        for (i = 0; i < 225; i++) {
                          if (!chbt[i]) {
                            if (turn == 1) {
                              pval[i] = gvaldivb(chbm, chbt, i / 15, i % 15);
                            } else {
                              pval[i] = gvaldivw(chbm, chbt, i / 15, i % 15);
                            }
                            pord[i] = pval + i;
                          } else {
                            pord[i] = &zero;
                          }
                        }
                        if (turn == 1) {
                          i = 0;
                          for (j = i + 1; j < 225; j++) {
                            if (*pord[i] < *pord[j]) {
                              pt = pord[i];
                              pord[i] = pord[j];
                              pord[j] = pt;
                            }
                          }
                        } else {
                          i = 0;
                          for (j = i + 1; j < 225; j++) {
                            if (*pord[i] > *pord[j]) {
                              pt = pord[i];
                              pord[i] = pord[j];
                              pord[j] = pt;
                            }
                          }
                        }
                        j = pord[0] - pval;
                        memcpy(tchbm, chbm, 900);
                        if (**pord != zero)
                          uchbm(chbt, tchbm, j / 15, j % 15, turn);
                        v = (turn == 1) ? gvaw(tchbm) : gvab(tchbm);
                        delete tchbm;
                        delete pval;
                        delete pord;
                        return v;
                      }
                      for (i = 0; i < 225; i++) {
                        if (!chbt[i]) {
                          if (turn == 1) {
                            pval[i] = gvaldivb(chbm, chbt, i / 15, i % 15) -
                                      0.02 * gvaldivw(chbm, chbt, i / 15, i % 15);
                            ;
                          } else {
                            pval[i] = gvaldivw(chbm, chbt, i / 15, i % 15) -
                                      0.02 * gvaldivb(chbm, chbt, i / 15, i % 15);
                          }
                          pord[i] = pval + i;
                        } else {
                          pord[i] = &zero;
                        }
                      }
                      if (turn == 1) {
                        for (i = 0; i < 20 + step / 5; i++) {
                          for (j = i + 1; j < 225; j++) {
                            if (*pord[i] < *pord[j]) {
                              pt = pord[i];
                              pord[i] = pord[j];
                              pord[j] = pt;
                            }
                          }
                        }
                      } else {
                        for (i = 0; i < 20 + step / 5; i++) {
                          for (j = i + 1; j < 225; j++) {
                            if (*pord[i] > *pord[j]) {
                              pt = pord[i];
                              pord[i] = pord[j];
                              pord[j] = pt;
                            }
                          }
                        }
                      }
                      i = 0;
                      k = 0;
                      if (*pord[0] > 600000 || *pord[0] < -600000) {
                        j = pord[0] - pval;
                        memcpy(tchbm, chbm, 900);
                        if (**pord != zero)
                          uchbm(chbt, tchbm, j / 15, j % 15, turn);
                        v = (turn == 1) ? gvaw(tchbm) : gvab(tchbm);
                        free(tchbm);
                        free(pval);
                        free(pord);
                        return v;
                      }
                      j = pord[k] - pval;
                      memcpy(tchbm, chbm, 900);
                      if (**pord != zero)
                        uchbm(chbt, tchbm, j / 15, j % 15, turn);
                      chbt[j] = turn;
                      v = cho(chbt, tchbm, 3 - turn, rt, depth - 1, zero);
                      chbt[j] = 0;
                      for (k = 1; i < 10 + step / 16, k < 20 + step / 8; k++) {
                        if (*pord[k] != *pord[k - 1]) {
                          i++;
                        }
                        if (*pord[k] == zero) {
                          break;
                        }
                        j = pord[k] - pval;
                        memcpy(tchbm, chbm, 900);
                        uchbm(chbt, tchbm, j / 15, j % 15, turn);
                        chbt[j] = turn;
                        vt = cho(chbt, tchbm, 3 - turn, rt, depth - 1, v);
                        chbt[j] = 0;
                        if (turn == 1) {
                          v = max(v, vt);
                          if (v >= expect) {
                            free(tchbm);
                            free(pval);
                            free(pord);
                            return v;
                          }
                        } else {
                          v = min(v, vt);
                          if (v <= expect) {
                            free(tchbm);
                            free(pval);
                            free(pord);
                            return v;
                          }
                        }
                      }
                      free(tchbm);
                      free(pval);
                      free(pord);
                      return v;
                    }
                    
                    int main() {
                      int2 pos;
                      int i, j;
                      for (i = 0; i < 225; i++) {
                        chb[i] = 0;
                      }
                      for (i = 0; i < 900; i++) {
                        chbmstep[i] = 0;
                      }
                      step = 1;
                      getjsonfirst(pos);
                      put(pos.x, pos.y);
                      for (i = 0; i < 200l; i++) {
                        j = chop(chb, chbmstep, (step - 1) % 2 + 1, 4);
                        pos.x = j / 15;
                        pos.y = j % 15;
                        putjson(pos);
                        put(pos.x, pos.y);
                        getjson(pos);
                        put(pos.x, pos.y);
                      }
                    }
                    `,
                },
            }).getResult()
        )
    );
    // why();
}

main();
