import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect } from "@storybook/test";
import { ApprovalCard } from "./ApprovalCard";
import { baseHandlers } from "@/mocks/handlers";
import type { TimeOffRequest } from "@/types";

const PENDING_REQUEST: TimeOffRequest = {
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

const meta: Meta<typeof ApprovalCard> = {
  title: "Manager/ApprovalCard",
  component: ApprovalCard,
  args: {
    request: PENDING_REQUEST,
  },
  parameters: {
    msw: { handlers: baseHandlers },
  },
};

export default meta;
type Story = StoryObj<typeof ApprovalCard>;

export const Default: Story = {
  name: "Pending — awaiting manager decision",
};

export const LiveBalanceCheck: Story = {
  name: "Live balance — manager fetches fresh HCM data before deciding",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /check balance/i }));
    // emp_1 / loc_nyc / annual seed balance is 15 days available
    await expect(await canvas.findByText(/15 days/i)).toBeInTheDocument();
    await expect(canvas.getByText(/available/i)).toBeInTheDocument();
  },
};

// Note: the approve/deny optimistic flow + rollback is verified in
// ApprovalQueue.stories.tsx, where the card is driven by the requests query
// cache. ApprovalCard is presentational (status comes from props), so an
// optimistic cache update would not be reflected here in isolation.

export const Approved: Story = {
  name: "Already approved — card dimmed, no action buttons",
  args: {
    request: { ...PENDING_REQUEST, status: "approved", resolvedAt: new Date().toISOString() },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: /deny/i })).not.toBeInTheDocument();
  },
};

export const Denied: Story = {
  name: "Already denied",
  args: {
    request: { ...PENDING_REQUEST, status: "denied", resolvedAt: new Date().toISOString() },
  },
};

export const SickLeave: Story = {
  name: "Sick leave request — different leave type",
  args: {
    request: {
      ...PENDING_REQUEST,
      leaveType: "sick",
      days: 1,
      note: undefined,
    },
  },
};

export const NoNote: Story = {
  name: "No note — optional field absent",
  args: {
    request: { ...PENDING_REQUEST, note: undefined },
  },
};
