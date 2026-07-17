# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # compile to ./lib via tsconfig.build.json
npm run watch          # compile in watch mode
npm test               # run jest with ts-jest
npm run test-watch     # jest in watch mode with coverage
```

## Architecture

`navigation-kit` is a framework-agnostic TypeScript routing utility. It exposes a typed router factory that has no runtime dependencies on React or `react-router`. Integration with a specific router (e.g. `react-router`) lives in a separate adapter package.

### Core: `createNavigator(routes, params?)`

Located in `src/utils/createNavigator.ts`. Takes a route map and optional `NavigatorParams` and returns a typed router object.

```ts
const routes = {
    home: "/",
    user: "/users/:id",
} as const; // as const is REQUIRED for TypeScript to infer literal path strings

const router = createNavigator(routes);
```

**`as const` is mandatory.** Without it, TypeScript widens string values to `string`, which breaks all type-level param inference. The `const` modifier on the `TRoutes` type parameter only preserves literals when an object literal is passed directly (not via a variable).

Returned object:
- **`pattern(route)`** — returns `PathPattern` for the route
- **`path(route)`** — returns the raw path string (e.g. `"/users/:id"`)
- **`url(route, params?, absolute?)`** — generates a URL; TypeScript enforces that `params` is required for routes with dynamic segments and forbidden for static routes. When `absolute` is `true`, the result is prefixed with the configured `baseUrl` (falls back to the plain relative path if no `baseUrl` was set)
- **`match(route, pathname)`** — returns `PathMatch | null`
- **`createRouter(navigate, pathname)`** — returns `{ to, match, path, url }` for navigation; `navigate` and `pathname` are injected by the adapter (e.g. `useNavigate()` and `useLocation().pathname` in react-router)

### Type machinery (`src/types/PathParam.ts`)

- `ParseParams<Path>` — recursively extracts `{ paramName: string }` entries from a path string
- `PathParam<Path>` — union of param names as string literals (e.g. `"id" | "lang"`)
- `ParsedParams<Path>` — for `generatePath()` internals, accepts `string | null | undefined`

TypeScript 6 removed support for the character-by-character `RegexMatchPlus` approach from react-router's type declarations. The replacement uses simpler template literal patterns (`${Prefix}:${Param}/${Suffix}` and `${Prefix}:${Param}`).

### `NavigatorParams` (`src/types/NavigatorParams.ts`)

Passed as the second argument to `createNavigator`, as a `Partial<NavigatorParams>`. Fields:
- **`baseUrl`** — optional; used by `url(route, params?, absolute: true)` to produce an absolute URL. A trailing slash is stripped; if unset, `absolute: true` just returns the relative path.
- **`generatePath`** / **`matchPath`** — override the default implementations (copied from react-router, no dependency). Both default to the local implementations.

```ts
createNavigator(routes, {
    baseUrl: "https://example.com",
    generatePath?: (path, params?) => string,
    matchPath?: (pattern, pathname) => PathMatch | null,
});
```

### `createRouter(navigate, pathname)` integration pattern

In a react-router adapter package:
```ts
const makeRouter = (routes) => {
    const router = createNavigator(routes);
    return {
        ...router,
        useNavigator: () => {
            const navigate = useNavigate();
            const { pathname } = useLocation();
            return useMemo(() => router.createRouter(navigate, pathname), [navigate, pathname]);
        },
    };
};
```

### Generic type parameter `TNavigateOptions`

Controls the type of options passed to `navigate` and forwarded through `to()`:

```ts
createNavigator<typeof routes, NavigateOptions>(routes);
// router.createRouter(navigate: (path, options?: NavigateOptions) => void, pathname)
// { to: (route, params?, options?: NavigateOptions) => void }
```

Defaults to `void` (no options).

### Build output

TypeScript compiles `src/**/*` to `./lib` (CommonJS, ES2016, `.d.ts` declarations). `tsconfig.build.json` excludes test files.

### Jest configuration quirk

`jest.config.ts` uses `export default` which causes a Node.js ES module warning. This is harmless — ts-jest handles compilation correctly. The project requires `@types/node` (for `__dirname` in the config) and `"types": ["node", "jest"]` in `tsconfig.json`.
