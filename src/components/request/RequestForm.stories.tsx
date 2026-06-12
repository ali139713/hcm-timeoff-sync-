import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within, expect, waitFor } from "@storybook/test";
import { RequestForm } from "./RequestForm";
import { baseHandlers, scenarios } from "@/mocks/handlers";

const meta: Meta<typeof RequestForm> = {
  title: "Request/RequestForm",
  component: RequestForm,
  args: { employeeId: "emp_1" },
  parameters: {
    msw: { handlers: baseHandlers },
  },
};

export default meta;
type Story = StoryObj<typeof RequestForm>;

export const Default: Story = {
  name: "Idle — button visible, modal closed",
};

export const ModalOpen: Story = {
  name: "Modal open — form ready",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /request time off/i }));
    await expect(canvas.getByText(/Submit request/i)).toBeInTheDocument();
    await expect(canvas.getByText(/Available:/i)).toBeInTheDocument();
  },
};

export const OptimisticPending: Story = {
  name: "Optimistic pending — slow HCM, spinner visible",
  parameters: {
    msw: { handlers: [...baseHandlers, ...scenarios.hcmSlow] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /request time off/i }));

    const daysInput = canvas.getByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "2");

    const startDate = canvasElement.querySelector('input[type="date"]') as HTMLInputElement;
    await userEvent.type(startDate, "2025-09-01");
    const endDate = canvasElement.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
    await userEvent.type(endDate, "2025-09-02");

    await userEvent.click(canvas.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(canvas.getByText(/Submitting/i)).toBeInTheDocument()
    );
  },
};

export const HCMRejected: Story = {
  name: "HCM rejected — rollback notice with preserved draft",
  parameters: {
    msw: { handlers: [...baseHandlers, ...scenarios.hcmConflict] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /request time off/i }));

    const daysInput = canvas.getByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "2");

    const startDate = canvasElement.querySelector('input[type="date"]') as HTMLInputElement;
    await userEvent.type(startDate, "2025-09-01");
    const endDate = canvasElement.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
    await userEvent.type(endDate, "2025-09-02");

    await userEvent.click(canvas.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(
        canvas.getByText(/Request could not be submitted/i)
      ).toBeInTheDocument()
    );
    await expect(canvas.getByText(/enough days/i)).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  },
};

export const Confirmed: Story = {
  name: "Confirmed — HCM accepted, pending confirmation screen",
  parameters: {
    msw: { handlers: baseHandlers },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /request time off/i }));

    const daysInput = canvas.getByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "1");

    const startDate = canvasElement.querySelector('input[type="date"]') as HTMLInputElement;
    await userEvent.type(startDate, "2025-09-01");
    const endDate = canvasElement.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
    await userEvent.type(endDate, "2025-09-01");

    await userEvent.click(canvas.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(canvas.getByText(/Request submitted/i)).toBeInTheDocument()
    );
    await expect(canvas.getByText(/pending HCM confirmation/i)).toBeInTheDocument();
  },
};

export const OptimisticRolledBack: Story = {
  name: "Optimistic rolled back — draft preserved for retry",
  parameters: {
    msw: { handlers: [...baseHandlers, ...scenarios.hcmConflict] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /request time off/i }));

    const daysInput = canvas.getByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "5");

    const startDate = canvasElement.querySelector('input[type="date"]') as HTMLInputElement;
    await userEvent.type(startDate, "2025-10-01");
    const endDate = canvasElement.querySelectorAll('input[type="date"]')[1] as HTMLInputElement;
    await userEvent.type(endDate, "2025-10-05");

    await userEvent.click(canvas.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(canvas.getByText(/Request could not be submitted/i)).toBeInTheDocument()
    );

    // Draft is still in the form fields
    await expect(
      (canvas.getByRole("spinbutton") as HTMLInputElement).value
    ).toBe("5");
  },
};
