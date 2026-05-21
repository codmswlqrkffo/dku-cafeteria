const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBvidE0C4lrd4uqrvJwQZCGEOTyI0WseVY",
  authDomain:        "dku-cafeteria.firebaseapp.com",
  databaseURL:       "https://dku-cafeteria-default-rtdb.firebaseio.com",
  projectId:         "dku-cafeteria",
  storageBucket:     "dku-cafeteria.firebasestorage.app",
  messagingSenderId: "895512565214",
  appId:             "1:895512565214:web:83a09ab251fa250e0f394f",
  measurementId:     "G-DZ2L55DSED"
};

let db = null;
function initFirebase() {
  if (typeof firebase === 'undefined') { console.warn('Firebase SDK not loaded'); return false; }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.database();
  return true;
}

const REF = {
  orders:  () => db.ref('orders'),
  order:   id => db.ref('orders/' + id),
  soldout: () => db.ref('soldout'),
  boothSt: () => db.ref('boothState'),
  seats:   () => db.ref('seats'),
  seat:    id => db.ref('seats/' + id),
  counter: () => db.ref('orderCounter'),
};

async function nextOrderNum() {
  const snap = await REF.counter().transaction(v => (v || 0) + 1);
  return snap.snapshot.val();
}

async function saveOrder(order) {
  await REF.order(order.id).set(order);
}

function subscribeOrders(cb) {
  REF.orders().on('value', snap => {
    const data = snap.val() || {};
    const list = Object.values(data).sort((a,b) => b.ts - a.ts);
    cb(list);
  });
}

async function markItemDone(orderId, itemIdx, done) {
  await db.ref(`orders/${orderId}/items/${itemIdx}/done`).set(done);
}

function subscribeSoldout(cb) {
  REF.soldout().on('value', snap => cb(snap.val() || {}));
}
async function setSoldout(key, val) {
  if (val) await db.ref('soldout/' + key).set(true);
  else     await db.ref('soldout/' + key).remove();
}

function subscribeBoothState(cb) {
  REF.boothSt().on('value', snap => cb(snap.val() || {}));
}
async function updateBoothState(boothId, data) {
  await db.ref('boothState/' + boothId).update(data);
}

function subscribeSeats(cb) {
  REF.seats().on('value', snap => cb(snap.val() || {}));
}
async function setSeat(tableId, data) {
  await REF.seat(tableId).set(data);
}
async function clearSeat(tableId) {
  await REF.seat(tableId).remove();
}
