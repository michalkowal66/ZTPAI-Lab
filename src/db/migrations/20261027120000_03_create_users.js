exports.up = async function(knex) {
  await knex.schema.createTable("users", table => {
    table.increments("id").primary();
    table.string("email").notNullable().unique();
    table.string("password_hash").notNullable();
    table.string("role").notNullable().defaultTo("USER");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN'))`);
};

exports.down = async function(knex) {
  await knex.schema.dropTable("users");
};
