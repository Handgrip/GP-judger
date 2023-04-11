export type GamerNo = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type UserNo = "judger" | GamerNo;
export interface Limit {
    time: number;
    memory: number;
}
export interface Code {
    language: string;
    source: string;
    limit: Limit;
}
export type Game = Record<UserNo, Code>;
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
export type SingleGamerRoundSummary = UsageVerdict;
export type GamerRoundSummary = Record<GamerNo, SingleGamerRoundSummary>;
export interface GameResult {
    complie: Record<UserNo, CompileSingleResult>;
    round: (JudgerRoundSummary | GamerRoundSummary)[];
}
export type Verdict = "OK" | "TLE" | "MLE" | "NJ" | "RE" | "CE" | "SE";
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
