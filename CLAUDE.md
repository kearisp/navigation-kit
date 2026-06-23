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

### Core: `createRouter(routes, adapter?)`

Located in `src/utils/createRouter.ts`. Takes a route map and an optional adapter and returns a typed router object.

```ts
const routes = {
    home: "/",
    user: "/users/:id",
} as const; // as const is REQUIRED for TypeScript to infer literal path strings

const router = createRouter(routes);
```

**`as const` is mandatory.** Without it, TypeScript widens string values to `string`, which breaks all type-level param inference. The `const` modifier on the `TRoutes` type parameter only preserves literals when an object literal is passed directly (not via a variable).

Returned object:
- **`pattern(route)`** — returns `PathPattern` for the route
- **`path(route)`** — returns the raw path string (e.g. `"/users/:id"`)
- **`url(route, params?)`** — generates a URL; TypeScript enforces that `params` is required for routes with dynamic segments and forbidden for static routes
- **`match(route, pathname)`** — returns `PathMatch | null`
- **`useRouter(navigate, pathname)`** — returns `{ to, match, path }` for navigation; `navigate` and `pathname` are injected by the adapter (e.g. `useNavigate()` and `useLocation().pathname` in react-router)

### Type machinery (`src/types/PathParam.ts`)

- `ParseParams<Path>` — recursively extracts `{ paramName: string }` entries from a path string
- `PathParam<Path>` — union of param names as string literals (e.g. `"id" | "lang"`)
- `ParsedParams<Path>` — for `generatePath()` internals, accepts `string | null | undefined`

TypeScript 6 removed support for the character-by-character `RegexMatchPlus` approach from react-router's type declarations. The replacement uses simpler template literal patterns (`${Prefix}:${Param}/${Suffix}` and `${Prefix}:${Param}`).

### `RouterAdapter` (`src/types/RouterAdapter.ts`)

The adapter interface allows overriding the default `generatePath` and `matchPath` implementations. Both default to the local implementations (copied from react-router, no dependency).

```ts
createRouter(routes, {
    generatePath?: (path, params?) => string,
    matchPath?: (pattern, pathname) => PathMatch | null,
});
```

### `useRouter(navigate, pathname)` integration pattern

In a react-router adapter package:
```ts
const makeRouter = (routes) => {
    const router = createRouter(routes);
    return {
        ...router,
        useRouter: () => {
            const navigate = useNavigate();
            const { pathname } = useLocation();
            return useMemo(() => router.useRouter(navigate, pathname), [navigate, pathname]);
        },
    };
};
```

### Generic type parameter `TNavigateOptions`

Controls the type of options passed to `navigate` and forwarded through `to()`:

```ts
createRouter<typeof routes, NavigateOptions>(routes);
// router.useRouter(navigate: (path, options?: NavigateOptions) => void, pathname)
// { to: (route, params?, options?: NavigateOptions) => void }
```

Defaults to `void` (no options).

### Build output

TypeScript compiles `src/**/*` to `./lib` (CommonJS, ES2016, `.d.ts` declarations). `tsconfig.build.json` excludes test files.

### Jest configuration quirk

`jest.config.ts` uses `export default` which causes a Node.js ES module warning. This is harmless — ts-jest handles compilation correctly. The project requires `@types/node` (for `__dirname` in the config) and `"types": ["node", "jest"]` in `tsconfig.json`.
