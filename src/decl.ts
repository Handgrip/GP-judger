export interface Limit {
    time: number;
    memory: number;
}
export interface Code {
    language: string;
    source: string;
    limit: Limit;
}
export type Game = Partial<Record<string, Code>>;
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
export type GamerRoundSummary = Partial<
    Partial<Record<string, SingleGamerRoundSummary>>
>;
export interface GameResult {
    complie: Partial<Record<string, CompileSingleResult>>;
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
    content: Partial<Record<string, string | number>>;
}
