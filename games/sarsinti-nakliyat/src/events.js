// Olay adları (TASARIM §14) — tek kaynak. Sim, ses, grafik ve arayüz bu listeye göre konuşur.
// Yük şekilleri için docs/MIMARI.md §4. 'sim' = createSim olayı, 'game' = main.js'in yaydığı, 'ui' = arayüz.
export const EVENTS = {
  levelStart: 'sim', levelEnd: 'sim', pause: 'game', resume: 'game',
  throttle: 'sim', brake: 'sim', engine: 'sim',
  wheelContact: 'sim', surfaceChange: 'sim', wheelspin: 'sim', suspension: 'sim',
  airborne: 'sim', land: 'sim', flip: 'sim', wheelie: 'sim', bodyHit: 'sim',
  cargoHit: 'sim', cargoDamage: 'sim', cargoLost: 'sim', cargoDelivered: 'sim',
  comboChange: 'sim', comboBank: 'sim', comboBurn: 'sim', coin: 'sim',
  driverEject: 'sim', crash: 'sim',
  bridgeStress: 'sim-p1', bridgeBreak: 'sim-p1', hazardTrigger: 'sim', nearMiss: 'sim', checkpoint: 'sim-p1',
  slowmo: 'sim', starEarned: 'sim', purchase: 'ui', upgrade: 'ui', toast: 'sim',
  'ui:click': 'ui', 'ui:back': 'ui', 'ui:star': 'ui',
};
export const EVENT_NAMES = Object.keys(EVENTS);
