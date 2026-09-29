/**
 * Shared in-memory store for the latest sensor readings from all zones.
 * Both the server.js handlers (ESP32 #1 → zones 1 & 2) and the
 * zone3Controller (ESP32 #2 → zone 3) update this object so the dashboard
 * always sees a merged, up-to-date snapshot.
 */
const store = {
  zones: [],
  timestamp: null,
  mode: 'AUTO',
};

/**
 * Merge a zone reading into the shared store.
 * @param {{ id: number, soil: number, temperature: number, humidity: number, gas: number, light: number, motor: string }} zoneData
 */
function upsertZone(zoneData) {
  const now = new Date();
  const dataWithTime = {
    ...zoneData,
    timestamp: zoneData.timestamp || now
  };
  const idx = store.zones.findIndex((z) => z.id === zoneData.id);
  if (idx !== -1) {
    store.zones[idx] = dataWithTime;
  } else {
    store.zones.push(dataWithTime);
  }
  store.zones.sort((a, b) => a.id - b.id);
}

function setMode(mode) {
  if (mode) {
    store.mode = mode;
  }
}

module.exports = { store, upsertZone, setMode };
