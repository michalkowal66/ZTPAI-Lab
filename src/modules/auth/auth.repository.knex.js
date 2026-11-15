function createUsersRepository(db) {
  return {
    async findByEmail(email) {
      return db("users").where({ email }).first();
    },
    async findById(id) {
      return db("users").select("id", "email", "role", "created_at").where({ id }).first();
    },
    async create({ email, passwordHash }) {
      const [row] = await db("users")
        .insert({ email, password_hash: passwordHash, role: "USER" })
        .returning(["id", "email", "role", "created_at"]);
      return row;
    }
  };
}

module.exports = { createUsersRepository };
