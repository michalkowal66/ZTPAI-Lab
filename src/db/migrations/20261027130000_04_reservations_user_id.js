exports.up = async function(knex) {
  await knex.schema.alterTable("reservations", table => {
    table.integer("user_id").references("id").inTable("users").onDelete("CASCADE");
  });

  const distinct = await knex("reservations").distinct("reserved_by");
  for (const { reserved_by } of distinct) {
    const email = `${reserved_by.toLowerCase().replace(/\s+/g, "-")}@legacy.local`;
    let user = await knex("users").where({ email }).first();
    if (!user) {
      [user] = await knex("users")
        .insert({ email, password_hash: "legacy-account-no-login", role: "USER" })
        .returning("id");
    }
    await knex("reservations").where({ reserved_by }).update({ user_id: user.id });
  }

  await knex.schema.alterTable("reservations", table => {
    table.integer("user_id").notNullable().alter();
  });
  await knex.schema.alterTable("reservations", table => {
    table.dropColumn("reserved_by");
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable("reservations", table => {
    table.string("reserved_by");
  });
  await knex("reservations").update({ reserved_by: knex.raw("'legacy-user-' || user_id") });
  await knex.schema.alterTable("reservations", table => {
    table.string("reserved_by").notNullable().alter();
    table.dropColumn("user_id");
  });
};
