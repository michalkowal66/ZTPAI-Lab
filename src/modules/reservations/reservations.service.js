const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require("../../errors/AppError");
const { noopEventBus } = require("../../events/eventBus");

const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

function createReservationsService({
  runInTransaction,
  eventBus = noopEventBus,
  now = () => new Date(),
}) {
  return {
    async listReservations(query, currentUser) {
      return runInTransaction(async ({ reservationsRepository }) => {
        const effectiveQuery = { ...query };
        if (currentUser.role !== "ADMIN") {
          effectiveQuery.userId = currentUser.id;
        }
        const { items, total } =
          await reservationsRepository.list(effectiveQuery);
        return {
          items,
          meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        };
      });
    },
    async getReservation(id, currentUser) {
      return runInTransaction(async ({ reservationsRepository }) => {
        const reservation = await reservationsRepository.findById(id);
        if (
          !reservation ||
          (currentUser.role !== "ADMIN" &&
            reservation.user.id !== currentUser.id)
        ) {
          throw new NotFoundError("Reservation");
        }
        return reservation;
      });
    },
    async createReservation(data, currentUser) {
      const created = await runInTransaction(
        async ({ reservationsRepository, roomsRepository }) => {
          // await roomsRepository.lockById(data.roomId);

          const room = await roomsRepository.findById(data.roomId);
          if (!room) throw new NotFoundError("Room");
          if (data.participants > room.capacity)
            throw new ConflictError("Room capacity exceeded");

          const start = new Date(data.startTime).getTime();
          const end = new Date(data.endTime).getTime();
          const currentTime = now().getTime();

          if (start < currentTime) {
            throw new ValidationError([
              {
                location: "body",
                field: "startTime",
                message: "Start time cannot be in the past",
              },
            ]);
          }

          const duration = end - start;
          if (duration < 15 * 60 * 1000 || duration > 8 * 60 * 60 * 1000) {
            throw new ValidationError([
              {
                location: "body",
                field: "endTime",
                message: "Invalid duration",
              },
            ]);
          }

          const { items: existingReservations } =
            await reservationsRepository.list({ roomId: data.roomId });

          await new Promise((resolve) => setTimeout(resolve, 200));

          for (const res of existingReservations) {
            if (res.status !== "CONFIRMED") continue;
            const resStart = new Date(res.startTime).getTime();
            const resEnd = new Date(res.endTime).getTime();
            if (start <= resEnd && resStart < end) {
              throw new ConflictError(
                "Room is already booked for this time",
                "ROOM_ALREADY_BOOKED",
              );
            }
          }

          return reservationsRepository.create({
            ...data,
            userId: currentUser.id,
          });
        },
      );

      eventBus.publish("reservation.created", {
        reservationId: created.id,
        roomId:
          (created.room && created.room.id) || created.roomId || data.roomId,
        userId:
          (created.user && created.user.id) || created.userId || currentUser.id,
        startTime: created.startTime,
        endTime: created.endTime,
      });

      return created;
    },
    async cancelReservation(id, currentUser) {
      let wasCancelled = false;
      let targetReservation;

      const updated = await runInTransaction(
        async ({ reservationsRepository }) => {
          const reservation = await reservationsRepository.findById(id);
          if (
            !reservation ||
            (currentUser.role !== "ADMIN" &&
              reservation.user.id !== currentUser.id)
          ) {
            throw new NotFoundError("Reservation");
          }
          targetReservation = reservation;
          if (reservation.status === "CANCELLED") return reservation;
          if (!ALLOWED_TRANSITIONS[reservation.status].includes("CANCELLED")) {
            throw new ConflictError(
              `Cannot change status from ${reservation.status} to CANCELLED`,
              "INVALID_STATUS_TRANSITION",
            );
          }
          if (new Date(reservation.startTime).getTime() <= now().getTime()) {
            throw new ConflictError(
              "Cannot cancel reservation that already started",
              "RESERVATION_ALREADY_STARTED",
            );
          }
          wasCancelled = true;
          return reservationsRepository.updateStatus(id, "CANCELLED");
        },
      );

      if (wasCancelled) {
        eventBus.publish("reservation.cancelled", {
          reservationId: updated.id,
          roomId:
            (updated.room && updated.room.id) ||
            (targetReservation.room && targetReservation.room.id) ||
            targetReservation.roomId,
          userId:
            (updated.user && updated.user.id) ||
            (targetReservation.user && targetReservation.user.id) ||
            targetReservation.userId,
          cancelledBy: currentUser.id,
        });
      }

      return updated;
    },
  };
}

module.exports = { createReservationsService };
