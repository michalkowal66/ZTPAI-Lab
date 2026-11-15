function registerAuditListeners(eventBus, db) {
  const save = async event => {
    await db("audit_log").insert({
      event_type: event.name,
      payload: event.payload,
      created_at: event.occurredAt
    });
  };

  eventBus.subscribe("reservation.created", save);
  eventBus.subscribe("reservation.cancelled", save);

  // Notification listener: notifies owner when an ADMIN cancels their reservation
  eventBus.subscribe("reservation.cancelled", async event => {
    const { reservationId, userId, cancelledBy } = event.payload;
    if (cancelledBy !== userId) {
      const owner = await db("users").where({ id: userId }).first();
      if (owner) {
        console.log(`[notification] to: ${owner.email} reservation #${reservationId} was cancelled by administrator`);
      }
    }
  });
}

module.exports = { registerAuditListeners };
