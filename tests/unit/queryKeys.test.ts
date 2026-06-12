import { describe, it, expect } from "vitest";
import { keys } from "@/lib/query-client";

// Cache key structure is critical — a key mismatch means invalidations silently
// target the wrong cache entry. These tests lock down the shape.
describe("cache keys", () => {
  describe("keys.balances", () => {
    it("scopes by employeeId", () => {
      expect(keys.balances("emp_1")).toEqual(["balances", "emp_1"]);
      expect(keys.balances("emp_2")).not.toEqual(keys.balances("emp_1"));
    });
  });

  describe("keys.balance", () => {
    it("scopes by employeeId, locationId, and leaveType", () => {
      const k = keys.balance("emp_1", "loc_nyc", "annual");
      expect(k).toEqual(["balance", "emp_1", "loc_nyc", "annual"]);
    });

    it("differs when any dimension changes", () => {
      const base = keys.balance("emp_1", "loc_nyc", "annual");
      expect(keys.balance("emp_1", "loc_lon", "annual")).not.toEqual(base);
      expect(keys.balance("emp_1", "loc_nyc", "sick")).not.toEqual(base);
      expect(keys.balance("emp_2", "loc_nyc", "annual")).not.toEqual(base);
    });

    it("does not collide with balances (batch) key", () => {
      const cellKey = keys.balance("emp_1", "loc_nyc", "annual");
      const batchKey = keys.balances("emp_1");
      expect(cellKey[0]).not.toEqual(batchKey[0]);
    });
  });

  describe("keys.allRequests", () => {
    it("does not collide with balance keys", () => {
      expect(keys.allRequests[0]).not.toEqual(keys.balances("emp_1")[0]);
      expect(keys.allRequests[0]).not.toEqual(
        keys.balance("emp_1", "loc_nyc", "annual")[0]
      );
    });
  });
});
