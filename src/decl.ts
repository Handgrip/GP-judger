export interface Limit {
    time: number;
    memory: number;
}
export interface Code {
    language: string;
    source: string;
    limit: Limit;
}
export type Game = Record<string, Code>;
export interface Callback {
    update: string;
    finish: string;
}
export interface Task {
    game: Game;
    callback: Callback;
}
export interface TimeUsage {
    usr: number;
    sys: number;
    real: number;
}
export interface Usage {
    time: TimeUsage;
    memory: number;
}
export type UsageVerdict = Usage & { verdict: Verdict };
export type CompileSingleResult = Usage & {
    message: string;
    verdict: Verdict;
};
export type JudgerRoundSummary = UsageVerdict & { output: FromJudger };
export type SingleGamerRoundSummary = UsageVerdict & GamerResponse;
export type GamerRoundSummary = Record<string, SingleGamerRoundSummary>;
export interface GameResult {
    compile: Record<string, CompileSingleResult>;
    round: (JudgerRoundSummary | GamerRoundSummary)[];
}
export type Verdict = "OK" | "TLE" | "MLE" | "NJ" | "RE" | "CE" | "SE" | "NR";
export interface GamerResponse {
    raw: string;
    verdict: Verdict;
}
export interface ToJudger {
    [key: string]: GamerResponse;
}
export interface FromJudger {
    command: "request" | "finish";
    display: string;
    content: Record<string, string | number>;
}
