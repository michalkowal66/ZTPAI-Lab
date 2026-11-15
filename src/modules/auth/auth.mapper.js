function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: new Date(user.created_at).toISOString()
  };
}

module.exports = { toUserResponse };
