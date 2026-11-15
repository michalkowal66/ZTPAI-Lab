const jwt = require("jsonwebtoken");
const { config } = require("../../config");

function getExpiresIn() {
  return config.JWT_EXPIRES_IN;
}

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, config.JWT_SECRET, {
    algorithm: "HS256",
    subject: String(user.id),
    expiresIn: getExpiresIn()
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] });
}

module.exports = { signAccessToken, verifyAccessToken, getExpiresIn };
