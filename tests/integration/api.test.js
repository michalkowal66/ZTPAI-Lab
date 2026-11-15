const request = require("supertest");
const bcrypt = require("bcryptjs");
const db = require("../../src/db/knex");
const { createApp } = require("../../src/app");
const {
  createBuildingsRepository,
} = require("../../src/modules/buildings/buildings.repository.knex");
const {
  createRoomsRepository,
} = require("../../src/modules/rooms/rooms.repository.knex");
const {
  createReservationsRepository,
} = require("../../src/modules/reservations/reservations.repository.knex");
const {
  createUsersRepository,
} = require("../../src/modules/auth/auth.repository.knex");
const {
  createAuditLogRepository,
} = require("../../src/modules/auditLog/auditLog.repository.knex");
const { createEventBus } = require("../../src/events/eventBus");
const { registerAuditListeners } = require("../../src/events/auditListeners");

function createKnexUnitOfWork(dbInstance) {
  return {
    runInTransaction: (fn) =>
      dbInstance.transaction((trx) =>
        fn({
          buildingsRepository: createBuildingsRepository(trx),
          roomsRepository: createRoomsRepository(trx),
          reservationsRepository: createReservationsRepository(trx),
          usersRepository: createUsersRepository(trx),
        }),
      ),
  };
}

const eventBus = createEventBus();
registerAuditListeners(eventBus, db);

const app = createApp({
  runInTransaction: createKnexUnitOfWork(db).runInTransaction,
  buildingsRepository: createBuildingsRepository(db),
  roomsRepository: createRoomsRepository(db),
  usersRepository: createUsersRepository(db),
  auditLogRepository: createAuditLogRepository(db),
  eventBus,
});

async function registerAndLogin(email, password = "password-123") {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password })
    .expect(201);

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);

  return res.body.accessToken;
}

async function createAndLoginAdmin(
  email = "admin@example.com",
  password = "admin-password-123",
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db("users")
    .insert({
      email,
      password_hash: passwordHash,
      role: "ADMIN",
    })
    .returning("*");

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);

  return { token: res.body.accessToken, user };
}

beforeAll(async () => {
  await db.migrate.latest();
});

beforeEach(async () => {
  await db.raw(
    "TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE",
  );
  const [building] = await db("buildings")
    .insert({
      name: "Budynek A",
      address: "ul. Główna 1",
    })
    .returning("id");

  await db("rooms").insert({
    building_id: building.id,
    name: "101",
    capacity: 10,
  });
});

afterAll(async () => {
  await db.destroy();
});

describe("API Integration Tests", () => {
  test("1. registration + login + GET /api/auth/me", async () => {
    const email = "jan@example.com";
    const token = await registerAndLogin(email);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email,
      role: "USER",
    });
    expect(res.body.id).toBeDefined();
  });

  test("2. POST /api/reservations -> 201, Location header and database persistence", async () => {
    const token = await registerAndLogin("alice@example.com");

    const payload = {
      roomId: 1,
      participants: 5,
      startTime: "2027-01-10T10:00:00.000Z",
      endTime: "2027-01-10T12:00:00.000Z",
    };

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);

    const row = await db("reservations").where({ id: res.body.id }).first();
    expect(row).toBeDefined();
    expect(row.room_id).toBe(payload.roomId);
    expect(row.participants).toBe(payload.participants);
    expect(row.status).toBe("CONFIRMED");
  });

  test("3. 400 with validation details for invalid body", async () => {
    const token = await registerAndLogin("bob@example.com");

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomId: "invalid-id" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: "body",
          field: "roomId",
        }),
      ]),
    );
  });

  test("4. 401 without token", async () => {
    const res = await request(app).get("/api/reservations");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("5. 403 for USER attempting to create a room", async () => {
    const token = await registerAndLogin("user@example.com");

    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({
        buildingId: 1,
        name: "102",
        capacity: 15,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("6. 404 for USER fetching another user's reservation", async () => {
    const userAToken = await registerAndLogin("usera@example.com");
    const userBToken = await registerAndLogin("userb@example.com");

    const createRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        roomId: 1,
        participants: 4,
        startTime: "2027-02-01T10:00:00.000Z",
        endTime: "2027-02-01T12:00:00.000Z",
      })
      .expect(201);

    const res = await request(app)
      .get(`/api/reservations/${createRes.body.id}`)
      .set("Authorization", `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("7. 409 ROOM_ALREADY_BOOKED for overlapping reservation", async () => {
    const userAToken = await registerAndLogin("user1@example.com");
    const userBToken = await registerAndLogin("user2@example.com");

    await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        roomId: 1,
        participants: 5,
        startTime: "2027-03-01T10:00:00.000Z",
        endTime: "2027-03-01T12:00:00.000Z",
      })
      .expect(201);

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${userBToken}`)
      .send({
        roomId: 1,
        participants: 3,
        startTime: "2027-03-01T11:00:00.000Z",
        endTime: "2027-03-01T13:00:00.000Z",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
  });

  test("8. pagination: meta.total and items count in data for limit smaller than total records", async () => {
    const token = await registerAndLogin("paginated@example.com");

    for (let day = 1; day <= 3; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${token}`)
        .send({
          roomId: 1,
          participants: 2,
          startTime: `2027-04-${dayStr}T10:00:00.000Z`,
          endTime: `2027-04-${dayStr}T11:00:00.000Z`,
        })
        .expect(201);
    }

    const res = await request(app)
      .get("/api/reservations?limit=2&page=1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.meta.limit).toBe(2);
  });

  describe("Events & Audit Log", () => {
    test("9. GET /api/admin/audit-log returns 403 for USER", async () => {
      const token = await registerAndLogin("regularuser@example.com");

      const res = await request(app)
        .get("/api/admin/audit-log")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    test("10. Full audit log scenario: create -> collision -> admin cancel -> double cancel", async () => {
      const userToken = await registerAndLogin("scenario-user@example.com");
      const { token: adminToken, user: adminUser } = await createAndLoginAdmin(
        "scenario-admin@example.com",
      );

      // 1. Create reservation
      const createRes = await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          roomId: 1,
          participants: 4,
          startTime: "2027-05-10T10:00:00.000Z",
          endTime: "2027-05-10T12:00:00.000Z",
        })
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const countAfterCreate = await db("audit_log")
        .count("* as count")
        .first();
      expect(Number(countAfterCreate.count)).toBe(1);

      // 2. Failed collision attempt (409)
      await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          roomId: 1,
          participants: 4,
          startTime: "2027-05-10T11:00:00.000Z",
          endTime: "2027-05-10T13:00:00.000Z",
        })
        .expect(409);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const countAfterCollision = await db("audit_log")
        .count("* as count")
        .first();
      expect(Number(countAfterCollision.count)).toBe(1);

      // 3. Admin cancels reservation
      await request(app)
        .patch(`/api/reservations/${createRes.body.id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const countAfterCancel = await db("audit_log")
        .count("* as count")
        .first();
      expect(Number(countAfterCancel.count)).toBe(2);

      // 4. Repeated (idempotent) cancellation
      await request(app)
        .patch(`/api/reservations/${createRes.body.id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const countAfterDoubleCancel = await db("audit_log")
        .count("* as count")
        .first();
      expect(Number(countAfterDoubleCancel.count)).toBe(2);

      // 5. Query GET /api/admin/audit-log
      const auditRes = await request(app)
        .get("/api/admin/audit-log")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data).toHaveLength(2);
      expect(auditRes.body.meta.total).toBe(2);

      // Descending order: reservation.cancelled is newest, reservation.created is older
      expect(auditRes.body.data[0].eventType).toBe("reservation.cancelled");
      expect(auditRes.body.data[0].payload).toMatchObject({
        reservationId: createRes.body.id,
        cancelledBy: adminUser.id,
      });

      expect(auditRes.body.data[1].eventType).toBe("reservation.created");
      expect(auditRes.body.data[1].payload).toMatchObject({
        reservationId: createRes.body.id,
        roomId: 1,
      });

      // Filter by ?eventType=reservation.created
      const filteredRes = await request(app)
        .get("/api/admin/audit-log?eventType=reservation.created")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data).toHaveLength(1);
      expect(filteredRes.body.data[0].eventType).toBe("reservation.created");
    });
  });
});
