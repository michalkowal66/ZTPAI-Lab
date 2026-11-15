const SORT_COLUMNS = {
  startTime: "res.start_time",
  createdAt: "res.created_at",
  participants: "res.participants"
};

function toReservationWithRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    room: {
      id: row.r_id,
      name: row.r_name,
      building: {
        id: row.b_id,
        name: row.b_name
      }
    },
    user: {
      id: row.u_id,
      email: row.u_email
    },
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at
  };
}

function createReservationsRepository(db) {
  return {
    async list({ roomId, buildingId, userId, status, from, to, page = 1, limit = 100, sort = "-startTime" }) {
      const base = db("reservations as res")
        .join("rooms as r", "res.room_id", "r.id")
        .join("buildings as b", "r.building_id", "b.id")
        .join("users as u", "res.user_id", "u.id")
        .modify(qb => {
          if (roomId) qb.where("res.room_id", roomId);
          if (buildingId) qb.where("r.building_id", buildingId);
          if (userId) qb.where("res.user_id", userId);
          if (status) qb.where("res.status", status);
          if (from && to) {
            qb.where("res.start_time", "<", to).andWhere("res.end_time", ">", from);
          } else if (from) {
            qb.where("res.end_time", ">", from);
          } else if (to) {
            qb.where("res.start_time", "<", to);
          }
        });

      const desc = sort.startsWith("-");
      const columnName = desc ? sort.slice(1) : sort;
      const column = SORT_COLUMNS[columnName];

      const [rows, { count }] = await Promise.all([
        base.clone()
          .select("res.*", "r.id as r_id", "r.name as r_name", "b.id as b_id", "b.name as b_name", "u.id as u_id", "u.email as u_email")
          .orderBy(column, desc ? "desc" : "asc")
          .orderBy("res.id", "asc")
          .limit(limit)
          .offset((page - 1) * limit),
        base.clone().count({ count: "*" }).first()
      ]);

      return { items: rows.map(toReservationWithRoom), total: Number(count) };
    },
    async findById(id) {
      const row = await db("reservations as res")
        .join("rooms as r", "res.room_id", "r.id")
        .join("buildings as b", "r.building_id", "b.id")
        .join("users as u", "res.user_id", "u.id")
        .select("res.*", "r.id as r_id", "r.name as r_name", "b.id as b_id", "b.name as b_name", "u.id as u_id", "u.email as u_email")
        .where("res.id", id).first();
      return toReservationWithRoom(row);
    },
    async create(data) {
      const [row] = await db("reservations").insert({
        room_id: data.roomId,
        user_id: data.userId,
        participants: data.participants,
        start_time: data.startTime,
        end_time: data.endTime,
        status: "CONFIRMED"
      }).returning("id");
      return this.findById(row.id);
    },
    async updateStatus(id, status) {
      const updateData = { status };
      if (status === "CANCELLED") updateData.cancelled_at = db.fn.now();
      await db("reservations").where({ id }).update(updateData);
      return this.findById(id);
    }
  };
}

module.exports = { createReservationsRepository };