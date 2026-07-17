import {PathPattern} from "./PathPattern";
import {PathMatch} from "./PathMatch";


export interface NavigatorParams {
    baseUrl?: string;
    generatePath: (path: string, params?: Record<string, string | number | null | undefined>) => string;
    matchPath: (pattern: PathPattern, pathname: string) => PathMatch | null;
}
