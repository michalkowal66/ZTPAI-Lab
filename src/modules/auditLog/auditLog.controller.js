function createAuditLogController(auditLogRepository) {
  return {
    async list(req, res) {
      const { items, total } = await auditLogRepository.list(req.validated.query);
      const { page, limit } = req.validated.query;
      res.json({
        data: items,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
  };
}

module.exports = { createAuditLogController };
