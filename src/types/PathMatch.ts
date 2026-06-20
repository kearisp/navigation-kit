import {PathPattern} from "./PathPattern";


export interface PathMatch<ParamKey extends string = string> {
    params: {readonly [K in ParamKey]: string | undefined};
    pathname: string;
    pathnameBase: string;
    pattern: PathPattern;
}
