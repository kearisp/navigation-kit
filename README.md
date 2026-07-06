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
import { createRouter } from "navigation-kit";

const routes = {
    home:    "/",
    about:   "/about",
    user:    "/users/:id",
    post:    "/users/:userId/posts/:postId",
} as const; // as const is required — see note below

const router = createRouter(routes);

router.path("user");                           // "/users/:id"
router.url("about");                           // "/about"
router.url("user", { id: "42" });             // "/users/42"
router.url("post", { userId: "1", postId: "99" }); // "/users/1/posts/99"
router.match("user", "/users/42");            // PathMatch | null
```

> **`as const` is required.** Without it TypeScript widens string values to `string` and loses the ability to infer route parameters. Always declare your routes object with `as const`.

## API

### `createRouter(routes, adapter?)`

Creates a typed router object from a route map.

```ts
const router = createRouter(routes);
```

**Type parameters:**

```ts
createRouter<TRoutes>(routes, adapter?)
```

- `TRoutes` — inferred from the routes argument; use `as const` on your routes object

---

#### `router.pattern(route)`

Returns the `PathPattern` for a named route.

```ts
router.pattern("user"); // { path: "/users/:id" }
```

Route values can also be `PathPattern` objects directly:

```ts
const routes = {
    users: { path: "/users", caseSensitive: true, end: false },
} as const;
```

---

#### `router.path(route)`

Returns the raw path string.

```ts
router.path("user"); // "/users/:id"
```

---

#### `router.url(route, params?)`

Generates a URL. TypeScript enforces that `params` is **required** for routes with dynamic segments and **forbidden** for static routes.

```ts
router.url("about");                    // ok — no params needed
router.url("user", { id: "42" });      // ok
router.url("user");                     // TS error — params required
router.url("about", { id: "42" });     // TS error — no params expected
```

Optional segments and wildcards are supported:

```ts
const routes = {
    lang:  "/:lang?/articles",
    files: "/files/*",
} as const;

router.url("lang", { lang: "en" });    // "/en/articles"
router.url("lang", { lang: null });    // "/articles"
router.url("files", { "*": "img/logo.png" }); // "/files/img/logo.png"
```

---

#### `router.match(route, pathname)`

Matches a pathname against a route pattern. Returns a `PathMatch` object or `null`.

```ts
const match = router.match("user", "/users/42");
match?.params.id; // "42"
```

---

#### `router.createNavigator<TNavigateOptions>(navigate, pathname)`

Creates navigation helpers by injecting a `navigate` function and the current `pathname`. Designed to be called inside a framework hook.

The generic `TNavigateOptions` types the `options` argument forwarded to `navigate` (e.g. `NavigateOptions` from react-router). Defaults to `void`.

```ts
const { to, match, path } = router.createNavigator(navigate, pathname);

to("about");                          // navigates to "/about"
to("user", { id: "42" });            // navigates to "/users/42"
match("user");                        // matches against current pathname
path("user");                         // "/users/:id"
```

`to()` follows the same overloads as `url()` — params are required/forbidden based on the route.

## Integration with react-router

This package has no dependency on `react-router`. Integration lives in a separate adapter package:

```ts
import { createRouter } from "navigation-kit";
import { useNavigate, useLocation, generatePath, matchPath } from "react-router";
import { useMemo } from "react";

export const makeRouter = <const TRoutes extends RouteMap>(routes: TRoutes) => {
    const router = createRouter(routes, { generatePath, matchPath });

    return {
        ...router,
        useNavigator: () => {
            const navigate = useNavigate();
            const { pathname } = useLocation();
            return useMemo(
                () => router.createNavigator(navigate, pathname),
                [navigate, pathname]
            );
        },
    };
};
```

## Custom adapter

Override `generatePath` and/or `matchPath` with your own implementations:

```ts
const router = createRouter(routes, {
    generatePath: (path, params) => myGeneratePath(path, params),
    matchPath: (pattern, pathname) => myMatchPath(pattern, pathname),
});
```

Both have built-in defaults (implementations copied from react-router, no runtime dependency).

## Navigate options

Pass a type parameter to `createNavigator` to type the options forwarded through `to()`:

```ts
import { NavigateOptions } from "react-router";

const { to } = router.createNavigator<NavigateOptions>(navigate, pathname);
to("about", undefined, { replace: true });
to("user", { id: "42" }, { state: { from: "/" } });
```

## Define once, import anywhere

The intended pattern is to create the router in one place and import it wherever navigation is needed — keeping route definitions as the single source of truth.

```ts
// router.ts — define once
import { createRouter } from "navigation-kit";

const routes = {
    home:  "/",
    user:  "/users/:id",
} as const;

export const Router = createRouter(routes);
```

```ts
// useRouter.ts — wrap in a framework hook
import { useMemo } from "react";
import { useNavigate, useLocation, NavigateOptions } from "react-router";
import { Router } from "./router";

export const useRouter = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return useMemo(
        () => Router.createNavigator<NavigateOptions>(navigate, pathname),
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
