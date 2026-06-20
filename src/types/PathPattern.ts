export type PathPattern<P extends string = string> = {
    path: P;
    caseSensitive?: boolean;
    end?: boolean;
};
