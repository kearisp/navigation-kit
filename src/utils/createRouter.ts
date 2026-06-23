import {RouteMap, PathPattern, PathMatch, PathParam, RouterAdapter} from "../types";
import {generatePath as defaultGeneratePath} from "./generatePath";
import {matchPath as defaultMatchPath} from "./matchPath";


type RouteParams<T extends string | PathPattern> =
    T extends string
        ? {[K in PathParam<T>]: string | number | null}
        : T extends PathPattern
            ? {[K in PathParam<T["path"]>]: string | number | null}
            : never;

type RoutesWithParams<T extends RouteMap> = {
    [K in keyof T]: T[K] extends string
        ? [PathParam<T[K]>] extends [never] ? never : K
        : T[K] extends PathPattern
            ? [PathParam<T[K]["path"]>] extends [never] ? never : K
            : never;
}[keyof T];

type RoutesWithoutParams<T extends RouteMap> = {
    [K in keyof T]: T[K] extends string
        ? [PathParam<T[K]>] extends [never] ? K : never
        : T[K] extends PathPattern
            ? [PathParam<T[K]["path"]>] extends [never] ? K : never
            : never;
}[keyof T];

export const createRouter = <const TRoutes extends RouteMap>(
    routes: TRoutes,
    adapter: Partial<RouterAdapter> = {}
) => {
    const _generatePath = adapter.generatePath ?? defaultGeneratePath;
    const _matchPath = adapter.matchPath ?? defaultMatchPath;

    const handlePattern = <R extends keyof TRoutes>(route: R): PathPattern => {
        const pattern = routes[route];
        return typeof pattern === "string" ? {path: pattern} : pattern as PathPattern;
    };

    const handlePath = <R extends keyof TRoutes>(route: R): string => {
        return handlePattern(route).path;
    };

    function handleUrl<R extends RoutesWithoutParams<TRoutes>>(route: R): string;
    function handleUrl<R extends RoutesWithParams<TRoutes>>(route: R, params: RouteParams<TRoutes[R]>): string;
    function handleUrl<R extends keyof TRoutes>(route: R, params?: RouteParams<TRoutes[R]>): string {
        return _generatePath(
            handlePattern(route).path,
            params as Record<string, string | null | undefined>
        );
    }

    const handleMatch = <R extends keyof TRoutes>(
        route: R,
        pathname: string
    ): PathMatch | null => {
        return _matchPath(handlePattern(route), pathname);
    };

    const handleUseRouter = <TNavigateOptions = void>(
        navigate: (path: string, options?: TNavigateOptions) => void,
        pathname: string
    ) => {
        function handleTo<R extends RoutesWithoutParams<TRoutes>>(
            route: R,
            params?: never,
            options?: TNavigateOptions
        ): void;
        function handleTo<R extends RoutesWithParams<TRoutes>>(
            route: R,
            params: RouteParams<TRoutes[R]>,
            options?: TNavigateOptions
        ): void;
        function handleTo<R extends keyof TRoutes>(
            route: R,
            params?: RouteParams<TRoutes[R]>,
            options?: TNavigateOptions
        ): void {
            navigate(
                _generatePath(
                    handlePattern(route).path,
                    params as Record<string, string | null | undefined>
                ),
                options
            );
        }

        return {
            to: handleTo,
            match: <R extends keyof TRoutes>(route: R, path: string = pathname) => handleMatch(route, path),
            path: handlePath,
            url: handleUrl
        };
    };

    return {
        pattern: handlePattern,
        path: handlePath,
        url: handleUrl,
        match: handleMatch,
        useRouter: handleUseRouter
    };
};
