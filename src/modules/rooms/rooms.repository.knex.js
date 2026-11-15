function toRoomWithBuilding(row) {
  if (!row) return null;
  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.name,
    capacity: row.capacity,
    createdAt: row.created_at,
    building: row.b_id ? { id: row.b_id, name: row.b_name } : undefined
  };
}

function createRoomsRepository(db) {
  return {
    async findAll() {
      const rows = await db("rooms as r")
        .join("buildings as b", "r.building_id", "b.id")
        .select("r.*", "b.id as b_id", "b.name as b_name")
        .orderBy("r.id", "asc");
      return rows.map(toRoomWithBuilding);
    },
    async findById(id) {
      const row = await db("rooms as r")
        .join("buildings as b", "r.building_id", "b.id")
        .select("r.*", "b.id as b_id", "b.name as b_name")
        .where("r.id", id).first();
      return toRoomWithBuilding(row);
    },
    async findByBuildingId(buildingId) {
      const rows = await db("rooms as r")
        .join("buildings as b", "r.building_id", "b.id")
        .select("r.*", "b.id as b_id", "b.name as b_name")
        .where("r.building_id", buildingId)
        .orderBy("r.id", "asc");
      return rows.map(toRoomWithBuilding);
    },
    async lockById(id) {
      await db("rooms").where({ id }).forUpdate().first();
    },
    async create(data) {
      const [row] = await db("rooms").insert({
        building_id: data.buildingId,
        name: data.name,
        capacity: data.capacity
      }).returning("id");
      return this.findById(row.id);
    },
    async update(id, data) {
      const payload = {};
      if (data.buildingId !== undefined) payload.building_id = data.buildingId;
      if (data.name !== undefined) payload.name = data.name;
      if (data.capacity !== undefined) payload.capacity = data.capacity;
      await db("rooms").where({ id }).update(payload);
      return this.findById(id);
    },
    async delete(id) {
      return db("rooms").where({ id }).del();
    }
  };
}
module.exports = { createRoomsRepository };