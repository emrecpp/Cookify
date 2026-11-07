import {describe, expect, it} from "vitest";
import {json} from "@codemirror/lang-json";
import {ensureSyntaxTree} from "@codemirror/language";
import {EditorState} from "@codemirror/state";
import {copyTargetAt, findMatches, foldText, jsonPathAt, jsonValueAt, lineOfPath, valueRangeAt} from "./editor";
import {toPython} from "./snippets";

function state(doc: string) {
    const s = EditorState.create({doc, extensions: [json()]});
    ensureSyntaxTree(s, s.doc.length, 5000);
    return s;
}

describe("JSON paths", () => {
    const doc = `{\n  "user": {\n    "email": "a@b.c"\n  },\n  "items": [\n    {"id": 1},\n    {"id": 2}\n  ]\n}`;
    it("computes the path at a position", () => {
        const s = state(doc);
        expect(jsonPathAt(s, doc.indexOf('"a@b.c"') + 2)).toBe("user.email");
        expect(jsonPathAt(s, doc.lastIndexOf('"id"') + 1)).toBe("items[1].id");
        // click after the trailing comma / in the indentation still points at the value on that line
        expect(jsonPathAt(s, doc.indexOf("},") + 2)).toBe("user");
    });
    it("finds the line of a path", () => {
        const s = state(doc);
        expect(lineOfPath(s, ["user", "email"])).toBe(3);
        expect(lineOfPath(s, ["items", 1, "id"])).toBe(7);
        expect(lineOfPath(s, ["missing"])).toBeNull();
    });
    it("copies the value at a position", () => {
        const s = state(doc);
        expect(jsonValueAt(s, doc.indexOf('"a@b.c"') + 2)).toBe("a@b.c"); // strings without quotes
        expect(jsonValueAt(s, doc.indexOf('"email"') + 1)).toBe("a@b.c"); // cursor on the key
        expect(jsonValueAt(s, doc.indexOf("1}"))).toBe("1");
        expect(jsonValueAt(s, doc.indexOf('"user"') + 1)).toBe('{\n  "email": "a@b.c"\n}'); // objects pretty-printed
    });
});

describe("snippets", () => {
    it("writes a python requests call with a json payload", () => {
        const code = toPython({method: "POST", url: "http://x/api", headers: {"Content-Type": "application/json", Authorization: "Bearer t"}, body: '{"a":true,"b":null}', missing: []});
        expect(code).toContain('requests.post("http://x/api", headers=headers, json=payload)');
        expect(code).toContain('"a": True');
        expect(code).toContain('"b": None');
        expect(code).not.toContain("Content-Type");
    });
});

describe("search", () => {
    it("folds Turkish and accented letters", () => {
        expect(foldText("İstanbul")).toBe("istanbul");
        expect(foldText("Şişli IĞDIR çöü")).toBe("sisli igdir cou");
        expect(foldText("İstanbul").length).toBe("İstanbul".length);
    });
    it("finds İstanbul when searching istanbul (and the other way round)", () => {
        const s = state('{"city": "İstanbul", "district": "Şişli", "x": "ISTANBUL"}');
        expect(findMatches(s, "istanbul").length).toBe(2);
        expect(findMatches(s, "İSTANBUL").length).toBe(2);
        expect(findMatches(s, "sisli").map((m) => s.sliceDoc(m.from, m.to))).toEqual(["Şişli"]);
    });
});

describe("copy from the response", () => {
    const doc = `{\n  "user": {\n    "email": "a@b.c",\n    "age": 31.5\n  },\n  "tags": [\n    "x"\n  ]\n}`;
    it("copies the value and path of a hovered line", () => {
        const s = state(doc);
        expect(copyTargetAt(s, 3)).toMatchObject({value: "a@b.c", path: "user.email"});
        expect(copyTargetAt(s, 4)).toMatchObject({value: "31.5", path: "user.age"});
        expect(copyTargetAt(s, 2)).toMatchObject({value: JSON.stringify({email: "a@b.c", age: 31.5}, null, 2), path: "user"});
        expect(copyTargetAt(s, 7)).toMatchObject({value: "x", path: "tags[0]"});
        expect(copyTargetAt(s, 1)?.path).toBe("");
    });
    it("puts the chip where the value starts, after the key", () => {
        const s = state(doc);
        expect(copyTargetAt(s, 3)?.from).toBe(doc.indexOf('"a@b.c"'));
        expect(copyTargetAt(s, 2)?.from).toBe(doc.indexOf("{", 1));
        expect(copyTargetAt(s, 7)?.from).toBe(doc.indexOf('"x"'));
        expect(copyTargetAt(s, 1)?.from).toBe(0);
    });
    it("has nothing to copy on closing lines", () => {
        const s = state(doc);
        expect(copyTargetAt(s, 5)).toBeNull();
        expect(copyTargetAt(s, 8)).toBeNull();
        expect(copyTargetAt(s, 9)).toBeNull();
    });
    it("double click selects a whole value", () => {
        const s = state(doc);
        const at = doc.indexOf("a@b") + 2;
        const r = valueRangeAt(s, at)!;
        expect(doc.slice(r.from, r.to)).toBe("a@b.c");
        const n = valueRangeAt(s, doc.indexOf("31.5") + 3)!;
        expect(doc.slice(n.from, n.to)).toBe("31.5");
        expect(valueRangeAt(s, doc.indexOf("{"))).toBeNull();
    });
});
