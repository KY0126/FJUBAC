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
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => state.auth,
}));

vi.mock("wouter", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    workspace: {
      projects: { mine: { useQuery: () => state.projects } },
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
  });

  it("將未登入訪客導向社員登入入口", () => {
    const html = renderToStaticMarkup(<MemberWorkspacePage />);

    expect(html).toContain("社員工作區需要登入");
    expect(html).toContain("社員登入");
  });

  it("讓登入的一般社員進入專案與資源工作區", () => {
    state.auth = { user: { name: "一般社員" }, isAuthenticated: true };

    const html = renderToStaticMarkup(<MemberWorkspacePage />);

    expect(html).toContain("我的學習與實作");
    expect(html).toContain("目前沒有有效專案指派");
    expect(html).toContain("目前沒有可存取的資源");
  });
});
