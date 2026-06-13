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

// The Dialog renders its content through a portal to document.body, which lives
// outside `canvasElement`. Scope all in-dialog queries to the document body.
function openDialog(canvasElement: HTMLElement) {
  const body = canvasElement.ownerDocument.body;
  return { body, screen: within(body) };
}

export const Default: Story = {
  name: "Idle — button visible, modal closed",
};

export const ModalOpen: Story = {
  name: "Modal open — form ready",
  play: async ({ canvasElement }) => {
    const { screen } = openDialog(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: /request time off/i }));
    await expect(await screen.findByText(/Submit request/i)).toBeInTheDocument();
    await expect(await screen.findByText(/Available:/i)).toBeInTheDocument();
  },
};

export const OptimisticPending: Story = {
  name: "Optimistic pending — slow HCM, spinner visible",
  parameters: {
    // override (slow POST) must precede baseHandlers — MSW uses first match
    msw: { handlers: [...scenarios.hcmSlow, ...baseHandlers] },
  },
  play: async ({ canvasElement }) => {
    const { body, screen } = openDialog(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: /request time off/i }));

    const daysInput = await screen.findByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "2");

    const dates = body.querySelectorAll('input[type="date"]');
    await userEvent.type(dates[0] as HTMLInputElement, "2025-09-01");
    await userEvent.type(dates[1] as HTMLInputElement, "2025-09-02");

    await userEvent.click(screen.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(screen.getByText(/Submitting/i)).toBeInTheDocument()
    );
  },
};

export const HCMRejected: Story = {
  name: "HCM rejected — rollback notice with preserved draft",
  parameters: {
    msw: { handlers: [...scenarios.hcmConflict, ...baseHandlers] },
  },
  play: async ({ canvasElement }) => {
    const { body, screen } = openDialog(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: /request time off/i }));

    const daysInput = await screen.findByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "2");

    const dates = body.querySelectorAll('input[type="date"]');
    await userEvent.type(dates[0] as HTMLInputElement, "2025-09-01");
    await userEvent.type(dates[1] as HTMLInputElement, "2025-09-02");

    await userEvent.click(screen.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Request could not be submitted/i)
      ).toBeInTheDocument()
    );
    await expect(screen.getByText(/enough days/i)).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  },
};

export const Confirmed: Story = {
  name: "Confirmed — HCM accepted, pending confirmation screen",
  parameters: {
    msw: { handlers: baseHandlers },
  },
  play: async ({ canvasElement }) => {
    const { body, screen } = openDialog(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: /request time off/i }));

    const daysInput = await screen.findByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "1");

    const dates = body.querySelectorAll('input[type="date"]');
    await userEvent.type(dates[0] as HTMLInputElement, "2025-09-01");
    await userEvent.type(dates[1] as HTMLInputElement, "2025-09-01");

    await userEvent.click(screen.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(screen.getByText(/Request submitted/i)).toBeInTheDocument()
    );
    await expect(screen.getByText(/pending HCM confirmation/i)).toBeInTheDocument();
  },
};

export const OptimisticRolledBack: Story = {
  name: "Optimistic rolled back — draft preserved for retry",
  parameters: {
    msw: { handlers: [...scenarios.hcmConflict, ...baseHandlers] },
  },
  play: async ({ canvasElement }) => {
    const { body, screen } = openDialog(canvasElement);
    await userEvent.click(screen.getByRole("button", { name: /request time off/i }));

    const daysInput = await screen.findByRole("spinbutton");
    await userEvent.clear(daysInput);
    await userEvent.type(daysInput, "5");

    const dates = body.querySelectorAll('input[type="date"]');
    await userEvent.type(dates[0] as HTMLInputElement, "2025-10-01");
    await userEvent.type(dates[1] as HTMLInputElement, "2025-10-05");

    await userEvent.click(screen.getByRole("button", { name: /Submit request/i }));

    await waitFor(() =>
      expect(screen.getByText(/Request could not be submitted/i)).toBeInTheDocument()
    );

    // Draft is still in the form fields
    await expect(
      (screen.getByRole("spinbutton") as HTMLInputElement).value
    ).toBe("5");
  },
};
