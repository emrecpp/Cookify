import {describe, expect, it} from "vitest";
import {configuredUrls, embeddedSpec} from "./discover";

const doc = {openapi: "3.0.3", info: {title: 'A } tricky " title', version: "1"}, paths: {}};

describe("embeddedSpec", () => {
    it("finds the document in a swagger-ui-express or NestJS init script", () => {
        const script = `window.onload = function() {
  var options = {
  "swaggerDoc": ${JSON.stringify(doc, null, 2)},
  "customOptions": {}
};
  url = options.swaggerUrl || url
}`;
        expect(JSON.parse(embeddedSpec(script)!)).toEqual(doc);
    });

    it("finds a spec passed to SwaggerUIBundle", () => {
        expect(JSON.parse(embeddedSpec(`SwaggerUIBundle({spec: ${JSON.stringify(doc)}, dom_id: "#swagger-ui"})`)!)).toEqual(doc);
    });

    it("ignores anything that isn't an OpenAPI document", () => {
        expect(embeddedSpec(`SwaggerUIBundle({url: "/openapi.json", dom_id: "#swagger-ui"})`)).toBeNull();
        expect(embeddedSpec(`var options = {"swaggerDoc": {"a": 1}}`)).toBeNull();
        expect(embeddedSpec(`SwaggerUIBundle({spec: {openapi: "3.0.0"}})`)).toBeNull();
    });
});

describe("configuredUrls", () => {
    it("reads a swagger-config file", () => {
        expect(configuredUrls({configUrl: "/v3/api-docs/swagger-config", url: "/v3/api-docs"})).toEqual(["/v3/api-docs"]);
        expect(configuredUrls({urls: [{url: "/a", name: "A"}, {url: "/b", name: "B"}]})).toEqual(["/a", "/b"]);
    });

    it("has nothing to offer for other JSON", () => {
        expect(configuredUrls({detail: "Not Found"})).toEqual([]);
        expect(configuredUrls([1, 2])).toEqual([]);
        expect(configuredUrls(null)).toEqual([]);
    });
});
