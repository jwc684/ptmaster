/**
 * Tests for useScheduleActions hook
 * Tests dialog state management and API call behavior (fetch mocking)
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useScheduleActions } from "./use-schedule-actions";
import type { ScheduleItemData } from "@/components/schedule/schedule-types";

// Mock sonner toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Store original fetch
const originalFetch = global.fetch;

function createMockSchedule(overrides?: Partial<ScheduleItemData>): ScheduleItemData {
  return {
    id: "sched-1",
    scheduledAt: "2025-01-15T10:00:00.000Z",
    status: "SCHEDULED",
    notes: "Test notes",
    memberName: "김회원",
    memberProfileId: "member-1",
    remainingPT: 10,
    trainerName: "박트레이너",
    attendance: null,
    ...overrides,
  };
}

describe("useScheduleActions", () => {
  let mockOnSuccess: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockOnSuccess = jest.fn();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // ============================================================
  // Dialog state management
  // ============================================================
  describe("dialog state management", () => {
    it("initializes all dialog states to closed", () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      expect(result.current.checkInDialogOpen).toBe(false);
      expect(result.current.cancelDialogOpen).toBe(false);
      expect(result.current.editDialogOpen).toBe(false);
      expect(result.current.deleteDialogOpen).toBe(false);
      expect(result.current.selectedSchedule).toBeNull();
      expect(result.current.actionLoading).toBeNull();
    });

    it("openCheckInDialog sets selectedSchedule and opens dialog", () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );
      const schedule = createMockSchedule();

      act(() => {
        result.current.openCheckInDialog(schedule);
      });

      expect(result.current.checkInDialogOpen).toBe(true);
      expect(result.current.selectedSchedule).toEqual(schedule);
      expect(result.current.checkInNotes).toEqual({ notes: "", internalNotes: "" });
    });

    it("openCancelDialog sets selectedSchedule and opens dialog", () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );
      const schedule = createMockSchedule();

      act(() => {
        result.current.openCancelDialog(schedule);
      });

      expect(result.current.cancelDialogOpen).toBe(true);
      expect(result.current.selectedSchedule).toEqual(schedule);
    });

    it("openEditDialog sets edit form with schedule data", () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );
      const schedule = createMockSchedule({
        scheduledAt: "2025-03-20T14:30:00.000Z",
        notes: "Existing note",
      });

      act(() => {
        result.current.openEditDialog(schedule);
      });

      expect(result.current.editDialogOpen).toBe(true);
      expect(result.current.selectedSchedule).toEqual(schedule);
      expect(result.current.editForm.date).toBe("2025-03-20");
      // Time depends on local timezone, just check it's non-empty
      expect(result.current.editForm.time).toBeTruthy();
      expect(result.current.editForm.notes).toBe("Existing note");
    });

    it("openEditDialog handles null notes", () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );
      const schedule = createMockSchedule({ notes: null });

      act(() => {
        result.current.openEditDialog(schedule);
      });

      expect(result.current.editForm.notes).toBe("");
    });

    it("openDeleteDialog sets selectedSchedule and opens dialog", () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );
      const schedule = createMockSchedule();

      act(() => {
        result.current.openDeleteDialog(schedule);
      });

      expect(result.current.deleteDialogOpen).toBe(true);
      expect(result.current.selectedSchedule).toEqual(schedule);
    });
  });

  // ============================================================
  // handleCheckIn
  // ============================================================
  describe("handleCheckIn", () => {
    it("does nothing when no schedule is selected", async () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleCheckIn();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sends PATCH with COMPLETED status on check-in", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "OK" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );
      const schedule = createMockSchedule();

      act(() => {
        result.current.openCheckInDialog(schedule);
      });

      await act(async () => {
        await result.current.handleCheckIn();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/schedules/sched-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("출석이 완료되었습니다.");
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(result.current.checkInDialogOpen).toBe(false);
      expect(result.current.selectedSchedule).toBeNull();
    });

    it("includes notes and internalNotes when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCheckInDialog(createMockSchedule());
        result.current.setCheckInNotes({
          notes: "Good session",
          internalNotes: "Internal memo",
        });
      });

      await act(async () => {
        await result.current.handleCheckIn();
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.notes).toBe("Good session");
      expect(fetchBody.internalNotes).toBe("Internal memo");
    });

    it("shows error toast on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCheckInDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleCheckIn();
      });

      expect(mockToastError).toHaveBeenCalledWith("Server error");
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("shows generic error toast on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCheckInDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleCheckIn();
      });

      expect(mockToastError).toHaveBeenCalledWith("출석 처리 중 오류가 발생했습니다.");
    });

    it("sets and clears actionLoading during check-in", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(pendingPromise);

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCheckInDialog(createMockSchedule());
      });

      // Start the check-in but don't await it yet
      let checkInPromise: Promise<void>;
      act(() => {
        checkInPromise = result.current.handleCheckIn();
      });

      // actionLoading should be set
      expect(result.current.actionLoading).toBe("checkIn");

      // Resolve the fetch
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({}),
        });
        await checkInPromise;
      });

      expect(result.current.actionLoading).toBeNull();
    });
  });

  // ============================================================
  // handleCancel
  // ============================================================
  describe("handleCancel", () => {
    it("does nothing when no schedule is selected", async () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleCancel(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sends CANCELLED status with deductPT=true", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "취소됨" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCancelDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleCancel(true);
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody).toEqual({ status: "CANCELLED", deductPT: true });
      expect(mockToastSuccess).toHaveBeenCalledWith("취소됨");
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("sends CANCELLED status with deductPT=false", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "PT 환불됨" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCancelDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleCancel(false);
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.deductPT).toBe(false);
    });

    it("handles API error response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Cannot cancel" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openCancelDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleCancel(false);
      });

      expect(mockToastError).toHaveBeenCalledWith("Cannot cancel");
    });
  });

  // ============================================================
  // handleRevert
  // ============================================================
  describe("handleRevert", () => {
    it("sends PATCH with SCHEDULED status to revert", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "Reverted" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleRevert("sched-99");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/schedules/sched-99", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" }),
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("Reverted");
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("sets actionLoading to scheduleId during revert", async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      let revertPromise: Promise<void>;
      act(() => {
        revertPromise = result.current.handleRevert("sched-42");
      });

      expect(result.current.actionLoading).toBe("sched-42");

      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({}),
        });
        await revertPromise;
      });

      expect(result.current.actionLoading).toBeNull();
    });

    it("handles API error on revert", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Cannot revert" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleRevert("sched-1");
      });

      expect(mockToastError).toHaveBeenCalledWith("Cannot revert");
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // handleEditSchedule
  // ============================================================
  describe("handleEditSchedule", () => {
    it("does nothing when no schedule is selected", async () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleEditSchedule();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sends PATCH with updated scheduledAt and notes", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openEditDialog(createMockSchedule());
        result.current.setEditForm({
          date: "2025-06-01",
          time: "15:00",
          notes: "Rescheduled",
        });
      });

      await act(async () => {
        await result.current.handleEditSchedule();
      });

      const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(fetchBody.scheduledAt).toContain("2025-06-01");
      expect(fetchBody.notes).toBe("Rescheduled");
      expect(mockToastSuccess).toHaveBeenCalledWith("일정이 수정되었습니다.");
      expect(result.current.editDialogOpen).toBe(false);
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("handles API error on edit", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Time conflict" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openEditDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleEditSchedule();
      });

      expect(mockToastError).toHaveBeenCalledWith("Time conflict");
    });
  });

  // ============================================================
  // handleDeleteSchedule
  // ============================================================
  describe("handleDeleteSchedule", () => {
    it("does nothing when no schedule is selected", async () => {
      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.handleDeleteSchedule();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sends DELETE request and shows success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openDeleteDialog(createMockSchedule({ id: "sched-del" }));
      });

      await act(async () => {
        await result.current.handleDeleteSchedule();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/schedules/sched-del", {
        method: "DELETE",
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("일정이 삭제되었습니다.");
      expect(result.current.deleteDialogOpen).toBe(false);
      expect(result.current.selectedSchedule).toBeNull();
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("handles API error on delete", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Cannot delete completed schedule" }),
      });

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openDeleteDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleDeleteSchedule();
      });

      expect(mockToastError).toHaveBeenCalledWith("Cannot delete completed schedule");
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it("handles network error on delete", async () => {
      mockFetch.mockRejectedValue(new Error("Offline"));

      const { result } = renderHook(() =>
        useScheduleActions({ onSuccess: mockOnSuccess })
      );

      act(() => {
        result.current.openDeleteDialog(createMockSchedule());
      });

      await act(async () => {
        await result.current.handleDeleteSchedule();
      });

      expect(mockToastError).toHaveBeenCalledWith("일정 삭제 중 오류가 발생했습니다.");
    });
  });
});
