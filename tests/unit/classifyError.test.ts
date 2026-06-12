import { describe, it, expect } from "vitest";
import { classifyHCMError, isHCMConflict } from "@/lib/errors";

describe("classifyHCMError", () => {
  it("returns network message for null", () => {
    expect(classifyHCMError(null)).toMatch(/couldn't reach/i);
  });

  it("returns network message for non-object", () => {
    expect(classifyHCMError("something broke")).toMatch(/couldn't reach/i);
  });

  it("classifies INSUFFICIENT_BALANCE correctly", () => {
    const err = { code: "INSUFFICIENT_BALANCE", message: "not enough days" };
    expect(classifyHCMError(err)).toMatch(/enough days/i);
  });

  it("classifies INVALID_DIMENSION correctly", () => {
    const err = { code: "INVALID_DIMENSION", message: "bad combo" };
    expect(classifyHCMError(err)).toMatch(/location and leave type/i);
  });

  it("falls back to network message for UNKNOWN code", () => {
    const err = { code: "UNKNOWN", message: "¯\\_(ツ)_/¯" };
    expect(classifyHCMError(err)).toMatch(/couldn't reach/i);
  });
});

describe("isHCMConflict", () => {
  it("returns true for INSUFFICIENT_BALANCE", () => {
    expect(isHCMConflict({ code: "INSUFFICIENT_BALANCE", message: "" })).toBe(true);
  });

  it("returns true for INVALID_DIMENSION", () => {
    expect(isHCMConflict({ code: "INVALID_DIMENSION", message: "" })).toBe(true);
  });

  it("returns false for UNKNOWN — should be retried", () => {
    expect(isHCMConflict({ code: "UNKNOWN", message: "" })).toBe(false);
  });

  it("returns false for non-object errors", () => {
    expect(isHCMConflict(null)).toBe(false);
    expect(isHCMConflict("string error")).toBe(false);
  });
});
