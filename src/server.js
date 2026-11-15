const { config } = require("./config");
const db = require("./db/knex");
const { createApp } = require("./app");
const { createBuildingsRepository } = require("./modules/buildings/buildings.repository.knex");
const { createRoomsRepository } = require("./modules/rooms/rooms.repository.knex");
const { createReservationsRepository } = require("./modules/reservations/reservations.repository.knex");
const { createUsersRepository } = require("./modules/auth/auth.repository.knex");

function createKnexUnitOfWork(dbInstance) {
  return {
    runInTransaction: fn => dbInstance.transaction(trx => fn({
      buildingsRepository: createBuildingsRepository(trx),
      roomsRepository: createRoomsRepository(trx),
      reservationsRepository: createReservationsRepository(trx),
      usersRepository: createUsersRepository(trx)
    }))
  };
}

const uow = createKnexUnitOfWork(db);

const repositories = {
  runInTransaction: uow.runInTransaction,
  buildingsRepository: createBuildingsRepository(db),
  roomsRepository: createRoomsRepository(db),
  usersRepository: createUsersRepository(db)
};

const app = createApp(repositories);
const server = app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));