import {PathPattern, PathMatch, ParamParseKey} from "../types";


type CompiledPathParam = {
    paramName: string;
    isOptional?: boolean
};

function compilePath(
    path: string,
    caseSensitive = false,
    end = true
): [RegExp, CompiledPathParam[]] {
    const params: CompiledPathParam[] = [];
    let regexpSource = "^" + path
        .replace(/\/*\*?$/, "")
        .replace(/^\/*/, "/")
        .replace(/[\\.*+^${}|()[\]]/g, "\\$&")
        .replace(/\/:([\w-]+)(\?)?/g, (match, paramName: string, isOptional: string | undefined, index: number, str: string) => {
            params.push({paramName, isOptional: isOptional != null});

            if(isOptional) {
                const nextChar = str.charAt(index + match.length);

                if(nextChar && nextChar !== "/")
                    return "/([^\\/]*)";

                return "(?:/([^\\/]*))?";
            }

            return "/([^\\/]+)";
        })
        .replace(/\/([\w-]+)\?(\/|$)/g, "(/$1)?$2");

    if(path.endsWith("*")) {
        params.push({paramName: "*"});
        regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
    }
    else if(end) {
        regexpSource += "\\/*$";
    }
    else if(path !== "" && path !== "/") {
        regexpSource += "(?:(?=\\/|$))";
    }

    return [
        caseSensitive ? new RegExp(regexpSource, "i") : new RegExp(regexpSource),
        params
    ];
}

export function matchPath<Path extends string>(
    pattern: PathPattern<Path> | Path,
    pathname: string
): PathMatch<ParamParseKey<Path>> | null {
    if(typeof pattern === "string") {
        pattern = {path: pattern, caseSensitive: false, end: true};
    }

    const [matcher, compiledParams] = compilePath(
        pattern.path,
        pattern.caseSensitive,
        pattern.end
    );
    const match = pathname.match(matcher);

    if(!match) return null;

    const matchedPathname = match[0];
    let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
    const captureGroups = match.slice(1);

    const params = compiledParams.reduce<Record<string, string | undefined>>(
        (memo, {paramName, isOptional}, index) => {
            if (paramName === "*") {
                const splatValue = captureGroups[index] || "";
                pathnameBase = matchedPathname
                    .slice(0, matchedPathname.length - splatValue.length)
                    .replace(/(.)\/+$/, "$1");
            }
            const value = captureGroups[index];
            memo[paramName] = isOptional && !value
                ? undefined
                : (value || "").replace(/%2F/g, "/");
            return memo;
        },
        {}
    );

    return {
        params: params as {readonly [K in ParamParseKey<Path>]: string | undefined},
        pathname: matchedPathname,
        pathnameBase,
        pattern: pattern as PathPattern
    };
}
