import React from "react";
import type { Preview } from "@storybook/nextjs-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "../src/components/ui/sonner";
import { useUIStore } from "../src/lib/store/ui";
import "../src/app/globals.css";

initialize({ onUnhandledRequest: "bypass" });

// useUIStore is a module singleton. Without this, a story that opens the request
// modal leaves `requestModalOpen: true` for the next story, which then mounts
// already-open and base-ui marks the rest of the canvas inert — hiding the
// trigger button from subsequent play() functions.
function resetUIStore() {
  useUIStore.setState({
    requestModalOpen: false,
    submissionStep: "idle",
    confirmedRequest: null,
    rollbackReason: null,
    savedDraft: null,
    dismissedStaleBanners: new Set(),
  });
}

function makeStoryQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

const preview: Preview = {
  loaders: [mswLoader],
  beforeEach: async () => {
    resetUIStore();
  },
  decorators: [
    (Story) => {
      const queryClient = makeStoryQueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50 p-6">
            <Story />
          </div>
          <Toaster position="top-right" richColors />
        </QueryClientProvider>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: { test: "todo" },
  },
};

export default preview;
