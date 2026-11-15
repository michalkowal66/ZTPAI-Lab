const bcrypt = require("bcryptjs");

exports.seed = async function(knex) {
  await knex.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

  const [admin, alice, bob] = await knex("users").insert([
    { email: "admin@example.com", password_hash: await bcrypt.hash("admin-password-123", 12), role: "ADMIN" },
    { email: "alice@example.com", password_hash: await bcrypt.hash("alice-password-123", 12), role: "USER" },
    { email: "bob@example.com", password_hash: await bcrypt.hash("bob-password-123", 12), role: "USER" }
  ]).returning("id");

  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Główna 1" },
    { name: "Budynek B", address: "ul. Boczna 2" }
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 10 },
    { building_id: 1, name: "102", capacity: 20 },
    { building_id: 2, name: "201", capacity: 30 },
    { building_id: 2, name: "202", capacity: 40 },
    { building_id: 2, name: "203", capacity: 50 }
  ]);

  await knex("reservations").insert([
    { room_id: 1, user_id: alice.id, participants: 5, start_time: "2026-12-10T10:00:00Z", end_time: "2026-12-10T12:00:00Z", status: "CONFIRMED" },
    { room_id: 1, user_id: bob.id, participants: 8, start_time: "2026-12-11T10:00:00Z", end_time: "2026-12-11T12:00:00Z", status: "CONFIRMED" },
    { room_id: 2, user_id: alice.id, participants: 15, start_time: "2026-12-12T14:00:00Z", end_time: "2026-12-12T16:00:00Z", status: "CONFIRMED" },
    { room_id: 2, user_id: bob.id, participants: 10, start_time: "2026-12-12T08:00:00Z", end_time: "2026-12-12T09:00:00Z", status: "CANCELLED", cancelled_at: "2026-10-20T08:00:00Z" },
    { room_id: 3, user_id: bob.id, participants: 5, start_time: "2024-01-01T10:00:00Z", end_time: "2024-01-01T12:00:00Z", status: "CONFIRMED" }
  ]);

  for (let i = 0; i < 15; i++) {
    await knex("reservations").insert({
      room_id: 1, user_id: alice.id, participants: 5,
      start_time: `2027-01-${i+1 < 10 ? '0'+(i+1) : i+1}T10:00:00Z`,
      end_time: `2027-01-${i+1 < 10 ? '0'+(i+1) : i+1}T12:00:00Z`,
      status: "CONFIRMED"
    });
  }
};
