import {PathPattern} from "./PathPattern";


export type RouteMap = {
    [key: string]: string | PathPattern;
};
