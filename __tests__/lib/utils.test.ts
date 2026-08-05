import { describe, it, expect } from "vitest";
import {
  cn,
  formatDate,
  formatDateTime,
  timeAgo,
  formatCurrency,
  getInitials,
  slugify,
  formatTimeSlot,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates Tailwind conflicting classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatDate", () => {
  it("formats a valid date string", () => {
    expect(formatDate("2024-01-15")).toBe("Jan 15, 2024");
  });

  it("returns em-dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats a valid date-time string", () => {
    const result = formatDateTime("2024-06-01T09:00:00");
    expect(result).toMatch(/Jun 1, 2024/);
    expect(result).toMatch(/9:00 AM/);
  });

  it("returns em-dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("formats in PHP currency", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("1,500");
    expect(result).toMatch(/PHP|₱/);
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });

  it("handles large numbers", () => {
    const result = formatCurrency(100000);
    expect(result).toContain("100,000");
  });
});

describe("getInitials", () => {
  it("returns initials for two-word name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns first two initials for multi-word name", () => {
    expect(getInitials("Maria Clara Santos")).toBe("MC");
  });

  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("returns ? for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });

  it("handles single name", () => {
    expect(getInitials("Bruce")).toBe("B");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("formatTimeSlot", () => {
  it("formats morning time slot", () => {
    expect(formatTimeSlot("09:00", "10:00")).toBe("9:00 AM – 10:00 AM");
  });

  it("formats afternoon time slot", () => {
    expect(formatTimeSlot("13:30", "15:00")).toBe("1:30 PM – 3:00 PM");
  });

  it("handles noon correctly", () => {
    expect(formatTimeSlot("12:00", "13:00")).toBe("12:00 PM – 1:00 PM");
  });

  it("handles midnight (00:00)", () => {
    expect(formatTimeSlot("00:00", "01:00")).toBe("12:00 AM – 1:00 AM");
  });
});

describe("timeAgo", () => {
  it("returns em-dash for null", () => {
    expect(timeAgo(null)).toBe("—");
  });

  it("returns a relative time string for a valid date", () => {
    const recent = new Date(Date.now() - 60_000);
    const result = timeAgo(recent);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
