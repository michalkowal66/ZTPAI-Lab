const {
  createReservationsService,
} = require("../../src/modules/reservations/reservations.service");
const {
  createInMemoryRepositories,
} = require("../../src/modules/reservations/reservations.repository.memory");

// Constants

const NOW = new Date("2026-11-01T00:00:00Z");
const ROOM = { id: 1, capacity: 10 };
const ROOM2 = { id: 2, capacity: 20 };
const ALICE = { id: 1, role: "USER" };
const BOB = { id: 2, role: "USER" };
const ADMIN = { id: 99, role: "ADMIN" };

// Helpers

function setup({ rooms, reservations, now, eventBus } = {}) {
  const { runInTransaction } = createInMemoryRepositories({
    rooms: rooms ?? [ROOM, ROOM2],
    reservations: reservations ?? [],
  });
  const mockEventBus = eventBus ?? {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
  const service = createReservationsService({
    runInTransaction,
    eventBus: mockEventBus,
    now: now ?? (() => NOW),
  });
  return { service, eventBus: mockEventBus };
}

/** Shorthand for a reservation data object (input to createReservation). */
const bookingData = (overrides = {}) => ({
  roomId: 1,
  participants: 5,
  startTime: "2026-12-01T10:00:00Z",
  endTime: "2026-12-01T12:00:00Z",
  ...overrides,
});

/** Shorthand for an existing reservation stored in memory. */
const existingReservation = (overrides = {}) => ({
  id: 1,
  roomId: 1,
  userId: BOB.id,
  participants: 5,
  startTime: "2026-12-01T10:00:00Z",
  endTime: "2026-12-01T12:00:00Z",
  status: "CONFIRMED",
  cancelledAt: null,
  user: { id: BOB.id },
  room: { id: 1 },
  ...overrides,
});

// Tests

describe("ReservationsService.createReservation", () => {
  // Overlap rules

  describe("overlap rules", () => {
    // Existing reservation in room 1: 10:00–12:00 on 2026-12-01
    test.each([
      [
        "partial overlap — new starts during existing",
        "2026-12-01T11:00:00Z",
        "2026-12-01T13:00:00Z",
      ],
      [
        "full containment — new is inside existing",
        "2026-12-01T10:30:00Z",
        "2026-12-01T11:30:00Z",
      ],
    ])("rejects %s", async (_label, startTime, endTime) => {
      const { service } = setup({ reservations: [existingReservation()] });

      await expect(
        service.createReservation(bookingData({ startTime, endTime }), ALICE),
      ).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
    });

    test("allows adjacent (touching) time slots — end == start", async () => {
      const { service } = setup({ reservations: [existingReservation()] });

      const result = await service.createReservation(
        bookingData({
          startTime: "2026-12-01T12:00:00Z",
          endTime: "2026-12-01T14:00:00Z",
        }),
        ALICE,
      );
      expect(result).toMatchObject({ status: "CONFIRMED" });
    });

    test("allows same time slot in a different room", async () => {
      const { service } = setup({ reservations: [existingReservation()] });

      const result = await service.createReservation(
        bookingData({ roomId: 2, participants: 5 }),
        ALICE,
      );
      expect(result).toMatchObject({ status: "CONFIRMED" });
    });
  });

  // Cancelled reservations

  test("cancelled reservation does not block the time slot", async () => {
    const { service } = setup({
      reservations: [existingReservation({ status: "CANCELLED" })],
    });

    const result = await service.createReservation(bookingData(), ALICE);
    expect(result).toMatchObject({ status: "CONFIRMED" });
  });

  // Capacity

  test("allows participants equal to room capacity", async () => {
    const { service } = setup();

    const result = await service.createReservation(
      bookingData({ participants: ROOM.capacity }),
      ALICE,
    );
    expect(result).toMatchObject({ status: "CONFIRMED" });
  });

  test("rejects participants exceeding room capacity by 1", async () => {
    const { service } = setup();

    await expect(
      service.createReservation(
        bookingData({ participants: ROOM.capacity + 1 }),
        ALICE,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  // Duration rules

  describe("duration rules", () => {
    test.each([
      [
        "exactly 15 min (allowed)",
        "2026-12-01T10:00:00Z",
        "2026-12-01T10:15:00Z",
        true,
      ],
      [
        "exactly 8 h (allowed)",
        "2026-12-01T10:00:00Z",
        "2026-12-01T18:00:00Z",
        true,
      ],
      [
        "14 min (rejected)",
        "2026-12-01T10:00:00Z",
        "2026-12-01T10:14:00Z",
        false,
      ],
      [
        "8 h 1 min (rejected)",
        "2026-12-01T10:00:00Z",
        "2026-12-01T18:01:00Z",
        false,
      ],
    ])("%s", async (_label, startTime, endTime, shouldSucceed) => {
      const { service } = setup();

      if (shouldSucceed) {
        const result = await service.createReservation(
          bookingData({ startTime, endTime }),
          ALICE,
        );
        expect(result).toMatchObject({ status: "CONFIRMED" });
      } else {
        await expect(
          service.createReservation(bookingData({ startTime, endTime }), ALICE),
        ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
      }
    });
  });
});

describe("ReservationsService.cancelReservation", () => {
  // Cancellation rules

  test("rejects cancellation of a reservation that has already started", async () => {
    const { service } = setup({
      reservations: [
        existingReservation({
          userId: ALICE.id,
          user: { id: ALICE.id },
          startTime: "2026-11-01T00:00:00Z", // same as NOW
          endTime: "2026-11-01T02:00:00Z",
        }),
      ],
    });

    await expect(service.cancelReservation(1, ALICE)).rejects.toMatchObject({
      code: "RESERVATION_ALREADY_STARTED",
    });
  });

  test("double cancellation is idempotent — cancelledAt does not change", async () => {
    const originalCancelledAt = "2026-10-15T08:00:00Z";
    const { service } = setup({
      reservations: [
        existingReservation({
          userId: ALICE.id,
          user: { id: ALICE.id },
          status: "CANCELLED",
          cancelledAt: originalCancelledAt,
        }),
      ],
    });

    const result = await service.cancelReservation(1, ALICE);
    expect(result.status).toBe("CANCELLED");
    expect(result.cancelledAt).toBe(originalCancelledAt);
  });

  // Ownership

  test("rejects cancellation by a different USER (returns NOT_FOUND)", async () => {
    const { service } = setup({
      reservations: [
        existingReservation({
          userId: ALICE.id,
          user: { id: ALICE.id },
        }),
      ],
    });

    await expect(service.cancelReservation(1, BOB)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("ADMIN can cancel another user's reservation", async () => {
    const { service } = setup({
      reservations: [
        existingReservation({
          userId: ALICE.id,
          user: { id: ALICE.id },
        }),
      ],
    });

    const result = await service.cancelReservation(1, ADMIN);
    expect(result.status).toBe("CANCELLED");
  });
});

describe("ReservationsService event publishing", () => {
  test("publishes reservation.created after successful reservation creation", async () => {
    const { service, eventBus } = setup();

    const created = await service.createReservation(bookingData(), ALICE);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      "reservation.created",
      expect.objectContaining({
        reservationId: created.id,
        roomId: 1,
        userId: ALICE.id,
        startTime: "2026-12-01T10:00:00Z",
        endTime: "2026-12-01T12:00:00Z",
      }),
    );
  });

  test("does not publish reservation.created when creation fails (e.g. room overlap)", async () => {
    const { service, eventBus } = setup({
      reservations: [existingReservation()],
    });

    await expect(
      service.createReservation(bookingData(), ALICE),
    ).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test("publishes reservation.cancelled after successful reservation cancellation", async () => {
    const { service, eventBus } = setup({
      reservations: [
        existingReservation({
          userId: ALICE.id,
          user: { id: ALICE.id },
        }),
      ],
    });

    await service.cancelReservation(1, ALICE);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      "reservation.cancelled",
      expect.objectContaining({
        reservationId: 1,
        roomId: 1,
        userId: ALICE.id,
        cancelledBy: ALICE.id,
      }),
    );
  });

  test("does not publish reservation.cancelled on idempotent double cancellation", async () => {
    const { service, eventBus } = setup({
      reservations: [
        existingReservation({
          userId: ALICE.id,
          user: { id: ALICE.id },
          status: "CANCELLED",
          cancelledAt: "2026-10-15T08:00:00Z",
        }),
      ],
    });

    await service.cancelReservation(1, ALICE);

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
