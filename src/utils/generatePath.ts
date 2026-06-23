import {ParsedParams} from "../types";


export function generatePath<Path extends string>(
    originalPath: Path,
    params: ParsedParams<Path> = {} as ParsedParams<Path>
): string {
    let path: string = originalPath;

    if(path.endsWith("*") && path !== "*" && !path.endsWith("/*")) {
        path = path.replace(/\*$/, "/*");
    }

    const prefix = path.startsWith("/") ? "/" : "";
    const stringify = (p: unknown) => p == null ? "" : typeof p === "string" ? p : String(p);
    const paramsMap = params as Record<string, unknown>;

    return (
        prefix +
        path.split(/\/+/)
            .map((segment, index, array) => {
                if(index === array.length - 1 && segment === "*") {
                    return stringify(paramsMap["*"]);
                }

                const keyMatch = segment.match(/^:([\w-]+)(\??)(.*)/);

                if(keyMatch) {
                    const [, key, optional, suffix] = keyMatch;
                    const param = paramsMap[key];

                    if(optional !== "?" && param == null) {
                        throw new Error(`Missing ":${key}" param`);
                    }
                    return encodeURIComponent(stringify(param)) + suffix;
                }

                return segment.replace(/\?$/g, "");
            })
            .filter(Boolean)
            .join("/")
    );
}
