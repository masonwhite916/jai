/**
 * No-op dispatch stub for route integration tests.
 * broadcastToRoom is a no-op so tests don't need a real WebSocket server.
 */
export const dispatch = {
  broadcastToRoom: () => {},
  attach:          () => {},
};
