import { describe, expect, it } from "vitest";
import { chunk, serializeForExport } from "./accountData";
import { Timestamp } from "firebase/firestore";

describe("accountData helpers", () => {
  it("chunk splits into batches of at most n", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 400)).toEqual([]);
  });
  it("serializeForExport turns Timestamps into ISO strings, recursively", () => {
    const t = Timestamp.fromDate(new Date("2026-10-14T12:00:00Z"));
    expect(serializeForExport({ a: t, b: [{ at: t }], c: "x" })).toEqual({
      a: "2026-10-14T12:00:00.000Z", b: [{ at: "2026-10-14T12:00:00.000Z" }], c: "x",
    });
  });
});
