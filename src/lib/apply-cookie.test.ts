import {describe, expect, it, vi} from "vitest";

// The module imports the popup's UI pieces; only the pure part is tested here.
vi.mock("@/components/ui/button.tsx", () => ({Button: () => null}));
vi.mock("react-hot-toast", () => ({default: {success: vi.fn(), error: vi.fn(), dismiss: vi.fn()}}));
const {cookieDetails} = await import("./apply-cookie");

const tab = (url: string) => ({url: new URL(url), domain: new URL(url).hostname});
const cookie = {alias: "a", name: "session", value: "v"};

describe("applying a saved cookie", () => {
    it("uses the url saved with the cookie as typed (with its scheme)", () => {
        const details = cookieDetails({...cookie, url: "https://api.example.com/some/path"}, tab("http://localhost:3000/docs"), 0);
        expect(details).toMatchObject({url: "https://api.example.com", secure: true, sameSite: "strict", domain: "localhost"});
    });
    it("adds a scheme to a bare host: http for local addresses, https otherwise", () => {
        expect(cookieDetails({...cookie, url: "example.com", domain: "example.com"}, tab("http://localhost/"), 0).url).toBe("https://example.com");
        expect(cookieDetails({...cookie, url: "localhost:8000"}, tab("http://localhost/"), 0)).toMatchObject({url: "http://localhost:8000", secure: false, sameSite: "lax"});
    });
    it("falls back to the tab's site", () => {
        expect(cookieDetails(cookie, tab("https://app.test/x?y"), 0)).toMatchObject({url: "https://app.test", domain: "app.test", secure: true, path: "/", expirationDate: 30 * 24 * 60 * 60});
    });
});
