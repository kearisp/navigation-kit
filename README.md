# navigation-kit

Framework-agnostic typed routing utility for TypeScript. Wraps your route definitions into a type-safe interface for URL generation, path matching, and navigation — without depending on any specific router library.

[![npm version](https://img.shields.io/npm/v/navigation-kit.svg)](https://www.npmjs.com/package/navigation-kit)
[![Publish](https://github.com/kearisp/navigation-kit/actions/workflows/publish-latest.yml/badge.svg?event=release)](https://github.com/kearisp/navigation-kit/actions/workflows/publish-latest.yml)
[![License](https://img.shields.io/npm/l/navigation-kit)](https://github.com/kearisp/navigation-kit/blob/master/LICENSE)

[![npm total downloads](https://img.shields.io/npm/dt/navigation-kit.svg)](https://www.npmjs.com/package/navigation-kit)
[![bundle size](https://img.shields.io/bundlephobia/minzip/navigation-kit)](https://bundlephobia.com/package/navigation-kit)
![Coverage](https://gist.githubusercontent.com/kearisp/f17f46c6332ea3bb043f27b0bddefa9f/raw/coverage-navigation-kit-latest.svg)

## Installation

```bash
npm install navigation-kit
```

## Quick start

```ts
import { createNavigator } from "navigation-kit";

const routes = {
    home:    "/",
    about:   "/about",
    user:    "/users/:id",
    post:    "/users/:userId/posts/:postId",
} as const; // as const is required — see note below

const navigator = createNavigator(routes);

navigator.path("user");                           // "/users/:id"
navigator.url("about");                           // "/about"
navigator.url("user", { id: "42" });             // "/users/42"
navigator.url("post", { userId: "1", postId: "99" }); // "/users/1/posts/99"
navigator.match("user", "/users/42");            // PathMatch | null
```

> **`as const` is required.** Without it TypeScript widens string values to `string` and loses the ability to infer route parameters. Always declare your routes object with `as const`.

## API

### `createNavigator(routes, params?)`

Creates a typed router object from a route map.

```ts
const navigator = createNavigator(routes);
```

**Type parameters:**

```ts
createNavigator<TRoutes>(routes, params?)
```

- `TRoutes` — inferred from the routes argument; use `as const` on your routes object

---

#### `router.pattern(route)`

Returns the `PathPattern` for a named route.

```ts
navigator.pattern("user"); // { path: "/users/:id" }
```

Route values can also be `PathPattern` objects directly:

```ts
const routes = {
    users: { path: "/users", caseSensitive: true, end: false },
} as const;
```

---

#### `navigator.path(route)`

Returns the raw path string.

```ts
navigator.path("user"); // "/users/:id"
```

---

#### `navigator.url(route, params?, absolute?)`

Generates a URL. TypeScript enforces that `params` is **required** for routes with dynamic segments and **forbidden** for static routes.

```ts
navigator.url("about");                    // ok — no params needed
navigator.url("user", { id: "42" });      // ok
navigator.url("user");                     // TS error — params required
navigator.url("about", { id: "42" });     // TS error — no params expected
```

Optional segments and wildcards are supported:

```ts
const routes = {
    lang:  "/:lang?/articles",
    files: "/files/*",
} as const;

navigator.url("lang", { lang: "en" });    // "/en/articles"
navigator.url("lang", { lang: null });    // "/articles"
navigator.url("files", { "*": "img/logo.png" }); // "/files/img/logo.png"
```

Pass `absolute: true` as the third argument to prefix the result with `baseUrl` (see [Base URL](#base-url)):

```ts
const navigator = createNavigator(routes, { baseUrl: "https://example.com" });

navigator.url("user", { id: "42" });          // "/users/42"
navigator.url("user", { id: "42" }, true);   // "https://example.com/users/42"
```

---

#### `navigator.match(route, pathname)`

Matches a pathname against a route pattern. Returns a `PathMatch` object or `null`.

```ts
const match = navigator.match("user", "/users/42");
match?.params.id; // "42"
```

---

#### `navigator.createRouter<TNavigateOptions>(navigate, pathname)`

Creates navigation helpers by injecting a `navigate` function and the current `pathname`. Designed to be called inside a framework hook.

The generic `TNavigateOptions` types the `options` argument forwarded to `navigate` (e.g. `NavigateOptions` from react-router). Defaults to `void`.

```ts
const { to, match, path, url } = navigator.createRouter(navigate, pathname);

to("about");                          // navigates to "/about"
to("user", { id: "42" });            // navigates to "/users/42"
match("user");                        // matches against current pathname
path("user");                         // "/users/:id"
url("user", { id: "42" }, true);     // "https://example.com/users/42" (with baseUrl configured)
```

`to()` follows the same overloads as `url()` — params are required/forbidden based on the route.

## Integration with react-router

This package has no dependency on `react-router`. Integration lives in a separate adapter package:

```ts
import { createNavigator } from "navigation-kit";
import { useNavigate, useLocation, generatePath, matchPath } from "react-router";
import { useMemo } from "react";

export const makeNavigator = <const TRoutes extends RouteMap>(routes: TRoutes) => {
    const navigator = createNavigator(routes, { generatePath, matchPath });

    return {
        ...router,
        useRouter: () => {
            const navigate = useNavigate();
            const { pathname } = useLocation();
            return useMemo(
                () => navigator.createRouter(navigate, pathname),
                [navigate, pathname]
            );
        },
    };
};
```

## Custom params

`createNavigator`'s second argument (`NavigatorParams`) lets you override `generatePath` and/or `matchPath`, and configure a `baseUrl`:

```ts
const navigator = createNavigator(routes, {
    generatePath: (path, params) => myGeneratePath(path, params),
    matchPath: (pattern, pathname) => myMatchPath(pattern, pathname),
    baseUrl: "https://example.com",
});
```

`generatePath` and `matchPath` both have built-in defaults (implementations copied from react-router, no runtime dependency).

## Base URL

Pass `baseUrl` to prefix absolute URLs without changing the default relative behavior:

```ts
const navigator = createNavigator(routes, { baseUrl: "https://example.com" });

navigator.url("user", { id: "42" });          // "/users/42"          — relative (default)
navigator.url("user", { id: "42" }, true);   // "https://example.com/users/42" — absolute
```

A trailing slash on `baseUrl` is stripped automatically. If `absolute: true` is passed without a configured `baseUrl`, the plain (relative) path is returned.

## Navigate options

Pass a type parameter to `createRouter` to type the options forwarded through `to()`:

```ts
import { NavigateOptions } from "react-router";

const { to } = navigator.createRouter<NavigateOptions>(navigate, pathname);
to("about", undefined, { replace: true });
to("user", { id: "42" }, { state: { from: "/" } });
```

## Define once, import anywhere

The intended pattern is to create the router in one place and import it wherever navigation is needed — keeping route definitions as the single source of truth.

```ts
// navigator.ts — define once
import { createNavigator } from "navigation-kit";

const routes = {
    home:  "/",
    user:  "/users/:id",
} as const;

export const Navigator = createNavigator(routes);
```

```ts
// useRouter.ts — wrap in a framework hook
import { useMemo } from "react";
import { useNavigate, useLocation, NavigateOptions } from "react-router";
import { Navigator } from "./navigator";

export const useRouter = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return useMemo(
        () => Navigator.createRouter<NavigateOptions>(navigate, pathname),
        [navigate, pathname]
    );
};
```

```ts
// SomeComponent.tsx — use anywhere
import { useRouter } from "./useRouter";

const { to, match } = useRouter();
to("user", { id: "42" });
```
