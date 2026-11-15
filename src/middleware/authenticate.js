const { verifyAccessToken } = require("../modules/auth/auth.tokens");
const { UnauthorizedError } = require("../errors/AppError");

function authenticate(req, res, next) {
  const header = req.get("Authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new UnauthorizedError("Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Token expired"));
    }
    next(new UnauthorizedError("Invalid token"));
  }
}

module.exports = authenticate;
