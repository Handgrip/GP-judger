import * as TOML from "@iarna/toml";
import { Type, plainToClass } from "class-transformer";
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    Min,
    ValidateNested,
    validateSync,
} from "class-validator";
import fs from "fs";
import { getLogger } from "log4js";
const logger = getLogger("ConfigService");
const configToml = fs.readFileSync("config/config.toml").toString();
export class LanguageConfig {
    @IsString()
    @IsNotEmpty()
    c!: string;
    @IsString()
    @IsNotEmpty()
    cpp!: string;
    @IsString()
    @IsNotEmpty()
    python!: string;
    @IsString()
    @IsNotEmpty()
    java!: string;
    @IsString()
    @IsNotEmpty()
    javac!: string;
    @IsString()
    @IsNotEmpty()
    node!: string;
}
export class SelfConfig {
    @IsInt()
    @IsPositive()
    judgeCapability!: number;
    @IsString()
    @IsNotEmpty()
    name!: string;
    @IsString()
    @IsOptional()
    software?: string;
    @IsString()
    @IsNotEmpty()
    host!: string;
    @IsInt()
    @Min(80)
    @Max(65534)
    port!: number;
    @IsString()
    @IsNotEmpty()
    trustIp!: string;
}
export class JudgeFactoryConfig {
    @IsString()
    @IsNotEmpty()
    docker!: string;
    @IsString()
    @IsNotEmpty()
    tmpdirBase!: string;
    @IsInt()
    @IsPositive()
    defaultPidLimit!: number;
    @IsInt()
    @Min(1000)
    uid!: number;
    @IsInt()
    @Min(1000)
    gid!: number;
    @IsString()
    @IsNotEmpty()
    imageId!: string;
    @IsInt()
    @Min(8388608)
    @Max(2147483648)
    compileMemoryLimit!: number;
    @IsInt()
    @Min(100)
    @Max(60000)
    compileTimeLimit!: number;
    @IsInt()
    @Min(8388608)
    @Max(2147483648)
    fileLimit!: number;
}
export class Config {
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => SelfConfig)
    self!: SelfConfig;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => LanguageConfig)
    language!: LanguageConfig;
    @ValidateNested()
    @IsNotEmpty()
    @Type(() => JudgeFactoryConfig)
    judger!: JudgeFactoryConfig;
}
let config: Config | undefined = undefined;

function tryValidate(
    args: Record<string, unknown>,
    padding = 0,
    prefix = ""
): boolean {
    const errs = validateSync(args, {
        whitelist: true,
        forbidNonWhitelisted: true,
    });
    if (errs.length !== 0) {
        for (const err of errs) {
            logger.fatal(
                `${new String().padEnd(
                    padding,
                    "│ "
                )}│ Config check failed on property ${prefix}${err.property}`
            );
            if (err.constraints !== undefined) {
                for (const constrings in err.constraints) {
                    logger.fatal(
                        `${new String().padEnd(
                            padding,
                            "│ "
                        )}├ because ${constrings} failed(${
                            err.constraints[constrings]
                        })`
                    );
                }
            }
            if (err.value !== undefined) {
                logger.fatal(
                    `${new String().padEnd(
                        padding,
                        "│ "
                    )}├─┬${new String().padEnd(10, "─")}`
                );
                tryValidate(
                    err.value,
                    padding + 2,
                    `${prefix}${err.property}.`
                );
            }
            {
                logger.fatal(
                    `${new String().padEnd(
                        padding,
                        "│ "
                    )}└ No More details avaiable`
                );
                return false;
            }
        }
    }
    return true;
}

export function getConfig(): Config {
    if (config === undefined) {
        logger.info("Loading Config from file");
        const rawConfig = TOML.parse(configToml);
        config = plainToClass(Config, rawConfig);
        // logger.fatal(JSON.stringify(rawConfig));
        // logger.fatal(JSON.stringify(config));
        if (!tryValidate(config as unknown as Record<string, unknown>)) {
            config = undefined;
            throw new Error("Failed to get Config, Please check configToml");
        }
        logger.info("Loaded Config from file");
    }
    return config;
}
