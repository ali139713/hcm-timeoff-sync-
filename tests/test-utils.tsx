import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";

export function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime Infinity: mutation hook tests have no active subscriber,
      // so entries would otherwise be GCed between assertions
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithClient(
  ui: React.ReactElement,
  queryClient?: QueryClient,
  options?: Omit<RenderOptions, "wrapper">
) {
  const client = queryClient ?? makeTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    options
  );
}

export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? makeTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}
