const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ roomsRepository, buildingsRepository }) {
  return {
    async listRooms() {
      return roomsRepository.findAll();
    },
    async getRoom(id) {
      const room = await roomsRepository.findById(id);
      if (!room) throw new NotFoundError("Room");
      return room;
    },
    async createRoom(data) {
      const building = await buildingsRepository.findById(data.buildingId);
      if (!building) throw new NotFoundError("Building");

      return roomsRepository.create(data);
    },
    async updateRoom(id, data) {
      const room = await roomsRepository.findById(id);
      if (!room) throw new NotFoundError("Room");
      if (data.buildingId !== undefined) {
        const building = await buildingsRepository.findById(data.buildingId);
        if (!building) throw new NotFoundError("Building");
      }
      return roomsRepository.update(id, data);
    },
    async deleteRoom(id) {
      const deleted = await roomsRepository.delete(id);
      if (!deleted) throw new NotFoundError("Room");
    }
  };
}

module.exports = { createRoomsService };