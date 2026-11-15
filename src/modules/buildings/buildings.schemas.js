const { z } = require("zod");

const idParams = z.object({
  id: z.coerce.number().int().positive()
});

const createBuildingBody = z.object({
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(255)
}).strict();

const updateBuildingBody = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().min(1).max(255).optional()
}).strict().refine(data => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

module.exports = { idParams, createBuildingBody, updateBuildingBody };