import { describe, it, expect } from "vitest";
import {
  calculatePagination,
  buildPaginatedResponse,
  calculateLimitOffset,
} from "#server/utils/pagination";

describe("calculatePagination", () => {
  it("calculates correct pagination for first page", () => {
    const result = calculatePagination(1, 10, 100);
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrevious: false,
    });
  });

  it("calculates correct pagination for middle page", () => {
    const result = calculatePagination(5, 10, 100);
    expect(result).toEqual({
      page: 5,
      perPage: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it("calculates correct pagination for last page", () => {
    const result = calculatePagination(10, 10, 100);
    expect(result).toEqual({
      page: 10,
      perPage: 10,
      total: 100,
      totalPages: 10,
      hasNext: false,
      hasPrevious: true,
    });
  });

  it("handles single page of results", () => {
    const result = calculatePagination(1, 10, 5);
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 5,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it("handles empty results", () => {
    const result = calculatePagination(1, 10, 0);
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it("rounds up totalPages for partial pages", () => {
    const result = calculatePagination(1, 10, 25);
    expect(result.totalPages).toBe(3); // 25 / 10 = 2.5, rounded up to 3
  });

  it("handles perPage = -1 (pagination disabled)", () => {
    const result = calculatePagination(1, -1, 100);
    expect(result).toEqual({
      page: 1,
      perPage: 100,
      total: 100,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  it("handles perPage = -1 with zero total", () => {
    const result = calculatePagination(1, -1, 0);
    expect(result).toEqual({
      page: 1,
      perPage: 0,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });
});

describe("buildPaginatedResponse", () => {
  it("builds response with items and pagination", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = buildPaginatedResponse(items, 1, 10, 2);
    expect(result).toEqual({
      items,
      pagination: {
        page: 1,
        perPage: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    });
  });

  it("builds response with empty items", () => {
    const result = buildPaginatedResponse([], 1, 10, 0);
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it("preserves item type", () => {
    interface User {
      id: string;
      name: string;
    }
    const items: User[] = [
      { id: "1", name: "John" },
      { id: "2", name: "Jane" },
    ];
    const result = buildPaginatedResponse(items, 1, 10, 2);
    expect(result.items[0].name).toBe("John");
  });
});

describe("calculateLimitOffset", () => {
  it("calculates correct offset for first page", () => {
    const result = calculateLimitOffset(1, 10);
    expect(result).toEqual({
      limit: 10,
      offset: 0,
    });
  });

  it("calculates correct offset for second page", () => {
    const result = calculateLimitOffset(2, 10);
    expect(result).toEqual({
      limit: 10,
      offset: 10,
    });
  });

  it("calculates correct offset for later pages", () => {
    const result = calculateLimitOffset(5, 20);
    expect(result).toEqual({
      limit: 20,
      offset: 80, // (5-1) * 20
    });
  });

  it("handles perPage = -1 (pagination disabled)", () => {
    const result = calculateLimitOffset(1, -1);
    expect(result).toEqual({
      limit: -1,
      offset: 0,
    });
  });

  it("handles small perPage", () => {
    const result = calculateLimitOffset(3, 5);
    expect(result).toEqual({
      limit: 5,
      offset: 10,
    });
  });
});
