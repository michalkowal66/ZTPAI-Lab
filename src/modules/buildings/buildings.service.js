const { NotFoundError } = require("../../errors/AppError");

function createBuildingsService({ buildingsRepository, roomsRepository }) {
  return {
    async listBuildings() {
      return buildingsRepository.findAll();
    },
    async getBuilding(id) {
      const building = await buildingsRepository.findById(id);
      if (!building) throw new NotFoundError("Building");
      return building;
    },
    async getBuildingRooms(id) {
      const building = await buildingsRepository.findById(id);
      if (!building) throw new NotFoundError("Building");
      return roomsRepository.findByBuildingId(id);
    },
    async createBuilding(data) {
      return buildingsRepository.create(data);
    },
    async updateBuilding(id, data) {
      const building = await buildingsRepository.findById(id);
      if (!building) throw new NotFoundError("Building");
      return buildingsRepository.update(id, data);
    },
    async deleteBuilding(id) {
      const deleted = await buildingsRepository.delete(id);
      if (!deleted) throw new NotFoundError("Building");
    }
  };
}

module.exports = { createBuildingsService };