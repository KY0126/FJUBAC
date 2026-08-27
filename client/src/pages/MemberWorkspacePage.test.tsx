import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: {
    user: null as { name?: string } | null,
    isAuthenticated: false,
  },
  projects: { isLoading: false, isError: false, data: [], refetch: vi.fn() },
  resources: { isLoading: false, isError: false, data: [], refetch: vi.fn() },
  tasks: { isLoading: false, isError: false, data: [], refetch: vi.fn() },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => state.auth,
}));

vi.mock("wouter", () => ({
  Link: ({ children }: { children: unknown }) => children,
  useLocation: () => ["/workspace", vi.fn()],
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    workspace: {
      projects: { mine: { useQuery: () => state.projects } },
      projectWork: { mine: { useQuery: () => state.tasks } },
      resources: {
        list: { useQuery: () => state.resources },
        download: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        open: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
    personal: {
      favoriteIds: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      setFavorite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import MemberWorkspacePage from "./MemberWorkspacePage";

describe("MemberWorkspacePage 社員存取", () => {
  beforeEach(() => {
    state.auth = { user: null, isAuthenticated: false };
    state.projects = { isLoading: false, isError: false, data: [], refetch: vi.fn() };
    state.resources = { isLoading: false, isError: false, data: [], refetch: vi.fn() };
    state.tasks = { isLoading: false, isError: false, data: [], refetch: vi.fn() };
  });

  it("保留舊網址並導向整合後的個人中心工作區", () => {
    const html = renderToStaticMarkup(<MemberWorkspacePage />);

    expect(html).toContain("社員工作區已整合至個人中心");
    expect(html).toContain("前往個人中心");
  });
});
