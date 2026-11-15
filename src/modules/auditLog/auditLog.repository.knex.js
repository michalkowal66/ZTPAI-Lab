function createAuditLogRepository(db) {
  return {
    async list({ eventType, page = 1, limit = 20 } = {}) {
      let base = db("audit_log");
      if (eventType) {
        base = base.where("event_type", eventType);
      }

      const [{ count }] = await base.clone().count("* as count");
      const rows = await base.clone()
        .orderBy("created_at", "desc")
        .orderBy("id", "desc")
        .limit(limit)
        .offset((page - 1) * limit);

      const items = rows.map(row => ({
        id: Number(row.id),
        eventType: row.event_type,
        payload: row.payload,
        createdAt: new Date(row.created_at).toISOString()
      }));

      return {
        items,
        total: Number(count)
      };
    }
  };
}

module.exports = { createAuditLogRepository };
