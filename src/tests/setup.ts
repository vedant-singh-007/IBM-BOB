// Global test setup
// Reset mocks between tests
import { vi } from "vitest";

// Mock Next.js server modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}));
