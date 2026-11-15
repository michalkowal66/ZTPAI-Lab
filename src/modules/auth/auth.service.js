const bcrypt = require("bcryptjs");
const { ConflictError, UnauthorizedError, NotFoundError } = require("../../errors/AppError");
const { signAccessToken, getExpiresIn } = require("./auth.tokens");

const BCRYPT_COST = 12;

function createAuthService({ usersRepository }) {
  return {
    async register({ email, password }) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      try {
        return await usersRepository.create({ email, passwordHash });
      } catch (err) {
        if (err.code === "23505") {
          throw new ConflictError("Email already taken", "EMAIL_TAKEN");
        }
        throw err;
      }
    },
    async login({ email, password }) {
      const user = await usersRepository.findByEmail(email);
      const passwordMatches = user && await bcrypt.compare(password, user.password_hash);
      if (!passwordMatches) {
        throw new UnauthorizedError("Invalid email or password");
      }
      return {
        accessToken: signAccessToken(user),
        tokenType: "Bearer",
        expiresIn: getExpiresIn()
      };
    },
    async getCurrentUser(userId) {
      const user = await usersRepository.findById(userId);
      if (!user) throw new NotFoundError("User");
      return user;
    }
  };
}

module.exports = { createAuthService };
