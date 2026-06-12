import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect } from "@storybook/test";
import { StaleBanner } from "./StaleBanner";

const meta: Meta<typeof StaleBanner> = {
  title: "Balance/StaleBanner",
  component: StaleBanner,
  args: {
    bannerKey: "emp_1:loc_nyc:annual",
    leaveType: "annual",
    previousValue: 15,
    freshValue: 20,
    onAccept: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof StaleBanner>;

export const AnniversaryBonus: Story = {
  name: "Balance increased — anniversary bonus",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/\+5 days/)).toBeInTheDocument();
    await expect(canvas.getByText(/20 days/)).toBeInTheDocument();
  },
};

export const BalanceDecreased: Story = {
  name: "Balance decreased — external deduction",
  args: {
    freshValue: 12,
    previousValue: 15,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/-3 days/)).toBeInTheDocument();
  },
};

export const DismissFlow: Story = {
  name: "Dismiss — banner disappears on X click",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dismissBtn = canvas.getByRole("button", { name: "" });
    await userEvent.click(dismissBtn);
    await expect(
      canvas.queryByText(/balance was updated/i)
    ).not.toBeInTheDocument();
  },
};
