const readline = require("readline/promises");
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
        gamerRequest(curGamer ^ 1, `${x} ${y}`);
    }
}

bootstrap().finally(() => {
    communication.close();
});
