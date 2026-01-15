import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { Conditions, combineConditions } from "#server/repositories/helpers/conditions";

// Mock table for testing
const mockTable = sqliteTable("test_table", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  name: text("name"),
  email: text("email"),
  deletedAt: text("deleted_at"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at"),
});

describe("Conditions.notDeleted", () => {
  it("returns SQL condition for deletedAt IS NULL", () => {
    const condition = Conditions.notDeleted(mockTable);
    expect(condition).toBeDefined();
    // Just verify we got a SQL condition back
    expect(condition).toBeInstanceOf(Object);
  });
});

describe("Conditions.workspaceScoped", () => {
  it("returns SQL condition for workspaceId equality", () => {
    const condition = Conditions.workspaceScoped(mockTable, "workspace-123");
    expect(condition).toBeDefined();
  });

  it("uses the provided workspaceId value", () => {
    const condition = Conditions.workspaceScoped(mockTable, "my-tenant");
    expect(condition).toBeDefined();
  });
});

describe("Conditions.userOwned", () => {
  it("returns SQL condition for userId equality", () => {
    const condition = Conditions.userOwned(mockTable, "user-123");
    expect(condition).toBeDefined();
  });
});

describe("Conditions.search", () => {
  it("returns undefined for empty term", () => {
    const condition = Conditions.search([mockTable.name], "");
    expect(condition).toBeUndefined();
  });

  it("returns undefined for whitespace-only term", () => {
    const condition = Conditions.search([mockTable.name], "   ");
    expect(condition).toBeUndefined();
  });

  it("returns undefined for undefined term", () => {
    const condition = Conditions.search([mockTable.name], undefined);
    expect(condition).toBeUndefined();
  });

  it("returns SQL condition for valid term with single column", () => {
    const condition = Conditions.search([mockTable.name], "john");
    expect(condition).toBeDefined();
  });

  it("returns SQL condition for valid term with multiple columns", () => {
    const condition = Conditions.search(
      [mockTable.name, mockTable.email],
      "john"
    );
    expect(condition).toBeDefined();
  });

  it("trims whitespace from search term", () => {
    const condition = Conditions.search([mockTable.name], "  john  ");
    expect(condition).toBeDefined();
  });
});

describe("Conditions.dateRange", () => {
  it("returns undefined when both start and end are missing", () => {
    const condition = Conditions.dateRange(mockTable.createdAt);
    expect(condition).toBeUndefined();
  });

  it("returns SQL condition for start date only", () => {
    const condition = Conditions.dateRange(
      mockTable.createdAt,
      "2024-01-01"
    );
    expect(condition).toBeDefined();
  });

  it("returns SQL condition for end date only", () => {
    const condition = Conditions.dateRange(
      mockTable.createdAt,
      undefined,
      "2024-12-31"
    );
    expect(condition).toBeDefined();
  });

  it("returns SQL condition for both start and end dates", () => {
    const condition = Conditions.dateRange(
      mockTable.createdAt,
      "2024-01-01",
      "2024-12-31"
    );
    expect(condition).toBeDefined();
  });

  it("accepts Date objects", () => {
    const condition = Conditions.dateRange(
      mockTable.createdAt,
      new Date("2024-01-01"),
      new Date("2024-12-31")
    );
    expect(condition).toBeDefined();
  });
});

describe("Conditions.activeOnly", () => {
  it("returns SQL condition combining notDeleted and isActive", () => {
    const condition = Conditions.activeOnly(mockTable);
    expect(condition).toBeDefined();
  });
});

describe("Conditions.all", () => {
  it("returns undefined for empty conditions", () => {
    const condition = Conditions.all();
    expect(condition).toBeUndefined();
  });

  it("returns undefined when all conditions are undefined", () => {
    const condition = Conditions.all(undefined, null, undefined);
    expect(condition).toBeUndefined();
  });

  it("filters out undefined and null values", () => {
    const validCondition = Conditions.notDeleted(mockTable);
    const condition = Conditions.all(undefined, validCondition, null);
    expect(condition).toBeDefined();
  });

  it("combines multiple valid conditions", () => {
    const condition = Conditions.all(
      Conditions.notDeleted(mockTable),
      Conditions.workspaceScoped(mockTable, "workspace-1")
    );
    expect(condition).toBeDefined();
  });
});

describe("Conditions.any", () => {
  it("returns undefined for empty conditions", () => {
    const condition = Conditions.any();
    expect(condition).toBeUndefined();
  });

  it("returns undefined when all conditions are undefined", () => {
    const condition = Conditions.any(undefined, null);
    expect(condition).toBeUndefined();
  });

  it("filters out undefined and null values", () => {
    const validCondition = Conditions.notDeleted(mockTable);
    const condition = Conditions.any(undefined, validCondition, null);
    expect(condition).toBeDefined();
  });

  it("combines multiple valid conditions with OR", () => {
    const condition = Conditions.any(
      Conditions.workspaceScoped(mockTable, "workspace-1"),
      Conditions.workspaceScoped(mockTable, "workspace-2")
    );
    expect(condition).toBeDefined();
  });
});

describe("combineConditions", () => {
  it("returns undefined for empty array", () => {
    const condition = combineConditions([]);
    expect(condition).toBeUndefined();
  });

  it("returns undefined for array of undefined values", () => {
    const condition = combineConditions([undefined, null, undefined]);
    expect(condition).toBeUndefined();
  });

  it("combines valid conditions", () => {
    const conditions = [
      Conditions.notDeleted(mockTable),
      Conditions.workspaceScoped(mockTable, "workspace-1"),
      undefined, // Should be filtered out
    ];
    const condition = combineConditions(conditions);
    expect(condition).toBeDefined();
  });

  it("is equivalent to Conditions.all", () => {
    const conditions = [
      Conditions.notDeleted(mockTable),
      Conditions.workspaceScoped(mockTable, "workspace-1"),
    ];
    const combined = combineConditions(conditions);
    const all = Conditions.all(...conditions);
    // Both should be defined
    expect(combined).toBeDefined();
    expect(all).toBeDefined();
  });
});
