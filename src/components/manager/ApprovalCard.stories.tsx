import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect, waitFor } from "@storybook/test";
import { ApprovalCard } from "./ApprovalCard";
import { baseHandlers, scenarios } from "@/mocks/handlers";
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
    managerId: "emp_3",
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
    await waitFor(() =>
      expect(canvas.getByText(/available/i)).toBeInTheDocument()
    );
    await expect(canvas.getByText("15")).toBeInTheDocument();
  },
};

export const ApproveFlow: Story = {
  name: "Approve — optimistic update then invalidation",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /approve/i }));
    await waitFor(() =>
      expect(canvas.getByText(/Approved/i)).toBeInTheDocument()
    );
  },
};

export const DenyFlow: Story = {
  name: "Deny — request marked denied, balance restored in HCM",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /deny/i }));
    await waitFor(() =>
      expect(canvas.getByText(/Denied/i)).toBeInTheDocument()
    );
  },
};

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

export const ApproveError: Story = {
  name: "HCM error on approve — optimistic rollback",
  parameters: {
    msw: { handlers: [...baseHandlers, ...scenarios.approveError] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /approve/i }));
    // After rollback, request reverts to pending
    await waitFor(() =>
      expect(canvas.getByText(/Pending/i)).toBeInTheDocument()
    );
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
