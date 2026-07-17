import {createNavigator} from "./createNavigator";


const routes = {
    home: "/",
    about: "/about",
    user: "/users/:id",
    userPost: "/users/:userId/posts/:postId",
    optionalLang: "/:lang?/articles",
    wildcard: "/files/*",
} as const;

const router = createNavigator(routes);

describe("createNavigator — pattern", () => {
    it("returns PathPattern for a string route", () => {
        expect(router.pattern("home")).toEqual({path: "/"});
    });

    it("returns the original PathPattern when route is an object", () => {
        const patternRoutes = createNavigator({
            users: {path: "/users", caseSensitive: true, end: false},
        });
        expect(patternRoutes.pattern("users")).toEqual({
            path: "/users",
            caseSensitive: true,
            end: false,
        });
    });
});

describe("createNavigator — path", () => {
    it("returns the raw path string", () => {
        expect(router.path("user")).toBe("/users/:id");
    });
});

describe("createNavigator — url", () => {
    it("generates a URL for a route without params", () => {
        expect(router.url("about")).toBe("/about");
    });

    it("generates a URL with a single param", () => {
        expect(router.url("user", {id: "42"})).toBe("/users/42");
    });

    it("generates a URL with multiple params", () => {
        expect(router.url("userPost", {userId: "1", postId: "99"})).toBe(
            "/users/1/posts/99"
        );
    });

    it("encodes special characters in params", () => {
        expect(router.url("user", {id: "hello world"})).toBe("/users/hello%20world");
    });

    it("handles numeric params", () => {
        expect(router.url("user", {id: 5 as unknown as string})).toBe("/users/5");
    });

    it("handles wildcard route", () => {
        expect(router.url("wildcard", {"*": "docs/readme.md"})).toBe(
            "/files/docs/readme.md"
        );
    });

    it("throws when a required param is missing", () => {
        expect(() =>
            router.url("user", {id: null as unknown as string})
        ).toThrow('Missing ":id" param');
    });
});

describe("createNavigator — url with baseUrl", () => {
    it("returns a relative URL when absolute is not passed", () => {
        const r = createNavigator(routes, {baseUrl: "https://example.com"});
        expect(r.url("user", {id: "42"})).toBe("/users/42");
    });

    it("returns a relative URL when absolute is false", () => {
        const r = createNavigator(routes, {baseUrl: "https://example.com"});
        expect(r.url("user", {id: "42"}, false)).toBe("/users/42");
    });

    it("prefixes the URL with baseUrl when absolute is true", () => {
        const r = createNavigator(routes, {baseUrl: "https://example.com"});
        expect(r.url("user", {id: "42"}, true)).toBe("https://example.com/users/42");
    });

    it("strips a trailing slash from baseUrl", () => {
        const r = createNavigator(routes, {baseUrl: "https://example.com/"});
        expect(r.url("about", undefined, true)).toBe("https://example.com/about");
    });

    it("works with routes without params", () => {
        const r = createNavigator(routes, {baseUrl: "https://example.com"});
        expect(r.url("about", undefined, true)).toBe("https://example.com/about");
    });

    it("returns the plain path when absolute is true but no baseUrl is configured", () => {
        expect(router.url("user", {id: "42"}, true)).toBe("/users/42");
    });

    it("createRouter().url also respects absolute/baseUrl", () => {
        const r = createNavigator(routes, {baseUrl: "https://example.com"});
        const {url} = r.createRouter(jest.fn(), "/");
        expect(url("user", {id: "42"}, true)).toBe("https://example.com/users/42");
    });
});

describe("createNavigator — match", () => {
    it("returns a match when pathname matches", () => {
        const result = router.match("user", "/users/42");
        expect(result).not.toBeNull();
        expect(result?.params.id).toBe("42");
    });

    it("returns null when pathname does not match", () => {
        expect(router.match("user", "/posts/42")).toBeNull();
    });

    it("extracts multiple params", () => {
        const result = router.match("userPost", "/users/1/posts/99");
        expect(result?.params).toEqual({userId: "1", postId: "99"});
    });

    it("is case-insensitive by default", () => {
        expect(router.match("about", "/ABOUT")).not.toBeNull();
    });

    it("respects caseSensitive flag on PathPattern routes", () => {
        const r = createNavigator({page: {path: "/Page", caseSensitive: true}});

        expect(r.match("page", "/page")).toBeNull();
        expect(r.match("page", "/Page")).not.toBeNull();
    });
});

describe("createNavigator — createNavigator", () => {
    it("to() calls navigate with the generated URL", () => {
        const navigate = jest.fn();
        const {to} = router.createRouter(navigate, "/");

        to("user", {id: "7"});
        expect(navigate).toHaveBeenCalledWith("/users/7", undefined);
    });

    it("to() passes navigate options through", () => {
        type Options = {replace: boolean};
        const navigate: jest.Mock<void, [string, Options?]> = jest.fn();
        const {to} = router.createRouter(navigate, "/");

        to("about", undefined, {replace: true});
        expect(navigate).toHaveBeenCalledWith("/about", {replace: true});
    });

    it("match() uses current pathname by default", () => {
        const navigate = jest.fn();
        const {match} = router.createRouter(navigate, "/users/99");

        const result = match("user");
        expect(result?.params.id).toBe("99");
    });

    it("match() accepts an explicit pathname", () => {
        const navigate = jest.fn();
        const {match} = router.createRouter(navigate, "/");

        const result = match("user", "/users/42");
        expect(result?.params.id).toBe("42");
    });

    it("path() returns the raw path string", () => {
        const {path} = router.createRouter(jest.fn(), "/");
        expect(path("user")).toBe("/users/:id");
    });
});

describe("createNavigator — custom adapter", () => {
    it("uses a custom generatePath when provided", () => {
        const customGeneratePath = jest.fn(() => "/custom");
        const r = createNavigator(routes, {generatePath: customGeneratePath});

        const url = r.url("about");
        expect(customGeneratePath).toHaveBeenCalled();
        expect(url).toBe("/custom");
    });

    it("uses a custom matchPath when provided", () => {
        const customMatchPath = jest.fn(() => null);
        const r = createNavigator(routes, {matchPath: customMatchPath});

        r.match("about", "/about");
        expect(customMatchPath).toHaveBeenCalled();
    });
});
