import {describe, expect, it} from "vitest";
import {parseBlocks} from "./components/Markdown";

describe("description markdown", () => {
    it("splits paragraphs, lists with continuation lines and nested lists", () => {
        const source = [
            "**Kimlik doğrulama:** `Authorization: Bearer <JWT>`",
            "",
            "**Çıktı:**",
            "- `payments`: satılmış paketler",
            "  `success` | `cancelled`",
            "- include:",
            "    - created_by_user",
            "    - reseller",
            "",
            "Kişiye ait ödeme bulunamazsa **404** döner.",
        ].join("\n");
        expect(parseBlocks(source)).toEqual([
            {kind: "p", lines: ["**Kimlik doğrulama:** `Authorization: Bearer <JWT>`"]},
            {kind: "p", lines: ["**Çıktı:**"]},
            {kind: "ul", items: [["`payments`: satılmış paketler", "`success` | `cancelled`"], ["include:", "  - created_by_user", "  - reseller"]]},
            {kind: "p", lines: ["Kişiye ait ödeme bulunamazsa **404** döner."]},
        ]);
    });
});
