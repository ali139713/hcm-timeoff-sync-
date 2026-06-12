import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { within, expect } from "@storybook/test";
import { ApprovalQueue } from "./ApprovalQueue";
import { baseHandlers, scenarios } from "@/mocks/handlers";

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
