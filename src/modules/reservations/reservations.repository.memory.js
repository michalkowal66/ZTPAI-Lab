/**
 * In-memory implementation of reservations + rooms repositories.
 * Used in unit tests to avoid any database dependency.
 */

function createInMemoryRepositories({ rooms = [], reservations = [] } = {}) {
  const roomsStore = rooms.map((r) => ({ ...r }));
  let nextId =
    reservations.length > 0
      ? Math.max(...reservations.map((r) => r.id)) + 1
      : 1;
  const reservationsStore = reservations.map((r) => ({ ...r }));

  const roomsRepository = {
    async findById(id) {
      const room = roomsStore.find((r) => r.id === id);
      return room ? { ...room } : null;
    },
  };

  const reservationsRepository = {
    async list({ roomId, userId, page = 1, limit = 100 } = {}) {
      let filtered = [...reservationsStore];
      if (roomId !== undefined)
        filtered = filtered.filter((r) => r.roomId === roomId);
      if (userId !== undefined)
        filtered = filtered.filter((r) => r.userId === userId);
      return { items: filtered.map((r) => ({ ...r })), total: filtered.length };
    },

    async findById(id) {
      const r = reservationsStore.find((r) => r.id === id);
      return r ? { ...r } : null;
    },

    async create(data) {
      const reservation = {
        id: nextId++,
        roomId: data.roomId,
        userId: data.userId,
        participants: data.participants,
        startTime: data.startTime,
        endTime: data.endTime,
        status: "CONFIRMED",
        cancelledAt: null,
        createdAt: new Date().toISOString(),
        user: { id: data.userId },
        room: { id: data.roomId },
      };
      reservationsStore.push(reservation);
      return { ...reservation };
    },

    async updateStatus(id, status) {
      const r = reservationsStore.find((r) => r.id === id);
      if (!r) return null;
      r.status = status;
      if (status === "CANCELLED") r.cancelledAt = new Date().toISOString();
      return { ...r };
    },
  };

  return {
    runInTransaction: async (fn) =>
      fn({ reservationsRepository, roomsRepository }),
  };
}

module.exports = { createInMemoryRepositories };
