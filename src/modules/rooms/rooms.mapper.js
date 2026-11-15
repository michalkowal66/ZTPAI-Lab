function toRoomResponse(room) {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    building: room.building ? {
      id: room.building.id,
      name: room.building.name
    } : undefined,
    createdAt: room.createdAt ? new Date(room.createdAt).toISOString() : null
  };
}

module.exports = { toRoomResponse };