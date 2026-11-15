const { z } = require("zod");

const idParams = z.object({
  id: z.coerce.number().int().positive()
});

const listReservationsQuery = z.object({
  roomId: z.coerce.number().int().positive().optional(),
  buildingId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"]).default("-startTime")
}).refine(data => {
  if (data.from && data.to) {
    return new Date(data.from) < new Date(data.to);
  }
  return true;
}, {
  message: "from must be strictly before to",
  path: ["from"]
});

const createReservationBody = z.object({
  roomId: z.number().int().positive(),
  participants: z.number().int().positive(),
  startTime: z.iso.datetime(),
  endTime: z.iso.datetime()
}).strict();

module.exports = { idParams, listReservationsQuery, createReservationBody };