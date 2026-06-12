import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect } from "@storybook/test";
import { RollbackNotice } from "./RollbackNotice";
import { useUIStore } from "@/lib/store/ui";
import { useEffect } from "react";

function WithRollbackState({ children }: { children: React.ReactNode }) {
  const { setRollback } = useUIStore();
  useEffect(() => {
    setRollback("You don't have enough days available for this request.", {
      locationId: "loc_nyc",
      leaveType: "annual",
      days: 5,
      startDate: "2025-09-01",
      endDate: "2025-09-05",
    });
  }, [setRollback]);
  return <>{children}</>;
}

const meta: Meta<typeof RollbackNotice> = {
  title: "Request/RollbackNotice",
  component: RollbackNotice,
  decorators: [
    (Story) => (
      <WithRollbackState>
        <Story />
      </WithRollbackState>
    ),
  ],
  args: { onRetry: () => {} },
};

export default meta;
type Story = StoryObj<typeof RollbackNotice>;

export const InsufficientBalance: Story = {
  name: "Insufficient balance — reason shown, draft hint visible",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Request could not be submitted/i)).toBeInTheDocument();
    await expect(canvas.getByText(/enough days/i)).toBeInTheDocument();
    await expect(canvas.getByText(/details have been preserved/i)).toBeInTheDocument();
  },
};

export const RetryAction: Story = {
  name: "Retry — clicking try again calls onRetry",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = canvas.getByRole("button", { name: /try again/i });
    await expect(retryBtn).toBeInTheDocument();
    await userEvent.click(retryBtn);
  },
};
