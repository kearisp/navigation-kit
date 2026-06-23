type _GetParam<Param extends string> =
    Param extends `${infer Name}?`
        ? {[K in Name]?: string | null | undefined}
        : {[K in Param]: string};

type _ParseParams<Path extends string> =
    Path extends `${infer _Prefix}:${infer Param}/${infer Suffix}`
        ? _GetParam<Param> & _ParseParams<`/${Suffix}`>
        : Path extends `${infer _Prefix}:${infer Param}`
            ? _GetParam<Param>
            : {};

export type ParseParams<Path extends string> =
    Path extends "*"
        ? {"*": string}
        : Path extends `${infer Rest}/*`
            ? {"*": string} & ParseParams<Rest>
            : _ParseParams<Path>;

export type Simplify<T> = {[K in keyof T]: T[K]} & {};

export type ParsedParams<Path extends string> = Simplify<
    ParseParams<Path> & {[key in string]: string | null | undefined}
>;

export type PathParam<Path extends string> = keyof ParseParams<Path> & string;

export type ParamParseKey<Segment extends string> =
    [PathParam<Segment>] extends [never] ? string : PathParam<Segment>;
