function toBuilding(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    roomsCount: row.roomsCount !== undefined ? Number(row.roomsCount) : undefined,
    createdAt: row.created_at
  };
}

function createBuildingsRepository(db) {
  return {
    async findAll() {
      const rows = await db("buildings as b")
        .leftJoin("rooms as r", "b.id", "r.building_id")
        .select("b.*")
        .count("r.id as roomsCount")
        .groupBy("b.id")
        .orderBy("b.id", "asc");
      return rows.map(toBuilding);
    },
    async findById(id) {
      const row = await db("buildings").where({ id }).first();
      return toBuilding(row);
    },
    async create(data) {
      const [row] = await db("buildings").insert({
        name: data.name,
        address: data.address
      }).returning("*");
      return toBuilding(row);
    },
    async update(id, data) {
      const [row] = await db("buildings").where({ id }).update(data).returning("*");
      return toBuilding(row);
    },
    async delete(id) {
      return db("buildings").where({ id }).del();
    }
  };
}

module.exports = { createBuildingsRepository };