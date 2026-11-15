const BASE = "http://localhost:3000/api";

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.com", password: "alice-password-123" })
  });
  const body = await res.json();
  return body.accessToken;
}

async function start(token) {
  const res = await fetch(`${BASE}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      roomId: 1,
      participants: 2,
      startTime: "2029-10-10T10:00:00Z",
      endTime: "2029-10-10T12:00:00Z"
    })
  });
  return res.status;
}

(async () => {
  const token = await login();
  const promises = Array(10).fill(null).map(() => start(token));
  const results = await Promise.all(promises);
  console.log("Statusy HTTP:", results);
})();
