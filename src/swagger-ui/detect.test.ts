import {describe, expect, it} from "vitest";
import {loadsSwaggerUi} from "./detect";

describe("loadsSwaggerUi", () => {
    it("recognizes the files Swagger UI pages load", () => {
        for (const file of [
            "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
            "http://localhost:3000/api/swagger-ui-init.js",
            "/swagger-ui/swagger-ui-standalone-preset.js?v=2",
            "https://unpkg.com/swagger-ui-dist/swagger-ui.css",
            "/webjars/swagger-ui/swagger-ui.min.css#x",
        ]) expect(loadsSwaggerUi([file], []), file).toBe(true);
    });

    it("recognizes the init script of a page", () => {
        expect(loadsSwaggerUi([], ["window.ui = SwaggerUIBundle({url: '/openapi.json'})"])).toBe(true);
        expect(loadsSwaggerUi([], ["const ui = SwaggerUI({dom_id: '#swagger-ui'})"])).toBe(true);
    });

    it("ignores pages that only mention Swagger UI", () => {
        expect(loadsSwaggerUi(
            ["https://www.facebook.com/search/top?q=swagger-ui", "https://static.example.com/app.js", "/swagger-ui/"],
            ['console.log("swagger-ui")', "const query = 'swagger ui bundle'"],
        )).toBe(false);
    });
});
