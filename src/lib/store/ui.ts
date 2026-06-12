import { create } from "zustand";
import type { TimeOffRequest } from "@/types";

export type SubmissionStep =
  | "idle"
  | "submitting"
  | "pending_hcm"
  | "confirmed"
  | "rolled_back";

interface RequestDraft {
  locationId: string;
  leaveType: string;
  days: number;
  startDate: string;
  endDate: string;
  note?: string;
}

interface UIState {
  // Request form
  requestModalOpen: boolean;
  submissionStep: SubmissionStep;
  confirmedRequest: TimeOffRequest | null;
  rollbackReason: string | null;
  savedDraft: RequestDraft | null;

  // Stale banners — keyed by "employeeId:locationId:leaveType"
  dismissedStaleBanners: Set<string>;

  // Actions
  openRequestModal: () => void;
  closeRequestModal: () => void;
  setSubmissionStep: (step: SubmissionStep) => void;
  setConfirmedRequest: (req: TimeOffRequest) => void;
  setRollback: (reason: string, draft: RequestDraft) => void;
  resetSubmission: () => void;
  dismissStaleBanner: (key: string) => void;
  clearDismissedBanners: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  requestModalOpen: false,
  submissionStep: "idle",
  confirmedRequest: null,
  rollbackReason: null,
  savedDraft: null,
  dismissedStaleBanners: new Set(),

  openRequestModal: () =>
    set({ requestModalOpen: true, submissionStep: "idle" }),

  closeRequestModal: () =>
    set({
      requestModalOpen: false,
      submissionStep: "idle",
      confirmedRequest: null,
      rollbackReason: null,
    }),

  setSubmissionStep: (step) => set({ submissionStep: step }),

  setConfirmedRequest: (req) =>
    set({ confirmedRequest: req, submissionStep: "confirmed" }),

  setRollback: (reason, draft) =>
    set({
      rollbackReason: reason,
      savedDraft: draft,
      submissionStep: "rolled_back",
    }),

  resetSubmission: () =>
    set({
      submissionStep: "idle",
      confirmedRequest: null,
      rollbackReason: null,
      savedDraft: null,
    }),

  dismissStaleBanner: (key) =>
    set((state) => ({
      dismissedStaleBanners: new Set([...state.dismissedStaleBanners, key]),
    })),

  clearDismissedBanners: () => set({ dismissedStaleBanners: new Set() }),
}));
