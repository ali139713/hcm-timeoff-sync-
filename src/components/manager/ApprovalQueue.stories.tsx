import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect, waitFor } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { ApprovalQueue } from "./ApprovalQueue";
import { baseHandlers, scenarios } from "@/mocks/handlers";
import type { TimeOffRequest } from "@/types";

const ONE_PENDING: TimeOffRequest = {
  id: "req_001",
  employeeId: "emp_1",
  locationId: "loc_nyc",
  leaveType: "annual",
  days: 3,
  startDate: "2025-08-01",
  endDate: "2025-08-03",
  note: "Summer vacation",
  status: "pending_hcm",
  submittedAt: new Date().toISOString(),
};

// Stateful HCM mock: PATCH persists the resolution so the post-settle refetch
// confirms the optimistic update instead of reverting it. This is what proves
// the optimistic-update-then-invalidation contract end to end.
function statefulRequestHandlers(
  seed: TimeOffRequest[],
  opts: { patchFails?: boolean } = {}
) {
  let state = structuredClone(seed);
  return [
    http.get("/api/hcm/requests", () => HttpResponse.json({ requests: state })),
    http.patch("/api/hcm/requests", async ({ request }) => {
      if (opts.patchFails) {
        return HttpResponse.json({ error: "HCM unavailable" }, { status: 503 });
      }
      const { requestId, action } = (await request.json()) as {
        requestId: string;
        action: "approve" | "deny";
      };
      state = state.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: action === "approve" ? "approved" : "denied",
              resolvedAt: new Date().toISOString(),
            }
          : r
      );
      return HttpResponse.json({ ok: true });
    }),
  ];
}

const meta: Meta<typeof ApprovalQueue> = {
  title: "Manager/ApprovalQueue",
  component: ApprovalQueue,
  parameters: {
    msw: { handlers: baseHandlers },
  },
};

export default meta;
type Story = StoryObj<typeof ApprovalQueue>;

export const Empty: Story = {
  name: "Empty — no pending requests",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/No pending requests/i)
    ).toBeInTheDocument();
  },
};

export const WithPendingRequests: Story = {
  name: "With requests — awaiting decision",
  parameters: {
    msw: { handlers: scenarios.withPendingRequests },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Sarah Chen/i)).toBeInTheDocument();
    await expect(canvas.getByText(/James Okafor/i)).toBeInTheDocument();
    await expect(canvas.getByText(/Awaiting decision \(2\)/i)).toBeInTheDocument();
  },
};

export const Loading: Story = {
  name: "Loading — fetching from HCM",
  parameters: {
    msw: { handlers: scenarios.loading },
  },
  play: async ({ canvasElement }) => {
    const skeletons = canvasElement.querySelectorAll(".animate-pulse");
    await expect(skeletons.length).toBeGreaterThan(0);
  },
};

export const ApproveFlow: Story = {
  name: "Approve — optimistic update then invalidation",
  parameters: {
    msw: { handlers: statefulRequestHandlers([ONE_PENDING]) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Sarah Chen/i);
    await userEvent.click(canvas.getByRole("button", { name: /approve/i }));

    // Optimistic update moves the card to the Resolved section and, after the
    // PATCH settles, the refetch confirms the approved status (no revert).
    await waitFor(() =>
      expect(canvas.getByText(/Resolved/i)).toBeInTheDocument()
    );
    await expect(canvas.getByText(/Approved/i)).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /approve/i })
    ).not.toBeInTheDocument();
  },
};

export const DenyFlow: Story = {
  name: "Deny — request marked denied, balance restored in HCM",
  parameters: {
    msw: { handlers: statefulRequestHandlers([ONE_PENDING]) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Sarah Chen/i);
    await userEvent.click(canvas.getByRole("button", { name: /deny/i }));

    await waitFor(() =>
      expect(canvas.getByText(/Resolved/i)).toBeInTheDocument()
    );
    await expect(canvas.getByText(/Denied/i)).toBeInTheDocument();
  },
};

export const ApproveError: Story = {
  name: "HCM error on approve — optimistic rollback to pending",
  parameters: {
    msw: { handlers: statefulRequestHandlers([ONE_PENDING], { patchFails: true }) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Sarah Chen/i);
    await userEvent.click(canvas.getByRole("button", { name: /approve/i }));

    // PATCH 503 → onError rolls the optimistic approval back; the card returns
    // to the Awaiting decision section with its action buttons restored.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /approve/i })
      ).toBeInTheDocument()
    );
    await expect(canvas.getByText(/Awaiting decision/i)).toBeInTheDocument();
    await expect(canvas.queryByText(/Resolved/i)).not.toBeInTheDocument();
  },
};
