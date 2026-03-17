export const DIRECTION_DELTAS = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  east: { x: 1, y: 0 },
  northwest: { x: -1, y: -1 },
  northeast: { x: 1, y: -1 },
  southwest: { x: -1, y: 1 },
  southeast: { x: 1, y: 1 }
};

export function getDirectionDelta(direction) {
  return DIRECTION_DELTAS[direction] || null;
}

