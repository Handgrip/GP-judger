import { C } from "./C";
import { CPP } from "./CPP";
import { Language, LanguageConfigureOption } from "./decl";
import { Java } from "./Java";
import { JS } from "./JS";
import { Python } from "./Python";

export function getConfiguredLanguage(
    lang: string,
    option: LanguageConfigureOption
): Language {
    lang = lang.toLowerCase();
    switch (lang) {
        case "c":
        case "c99":
            return new C(option);
            break;
        case "cpp":
        case "cxx":
        case "c++":
        case "cpp17":
            return new CPP(option);
            break;
        case "java":
        case "java8":
            return new Java(option);
            break;
        case "py":
        case "py3":
        case "python":
        case "python3":
            return new Python(option);
            break;
        case "js":
        case "javascript":
            return new JS(option);
            break;
        default:
            throw new Error("Unrecognized language");
            break;
    }
}
