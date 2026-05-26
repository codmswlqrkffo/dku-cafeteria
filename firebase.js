const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBvidE0C4lrd4uqrvJwQZCGEOTyI0WseVY",
  authDomain:        "dku-cafeteria.firebaseapp.com",
  databaseURL:       "https://dku-cafeteria-default-rtdb.firebaseio.com",
  projectId:         "dku-cafeteria",
  storageBucket:     "dku-cafeteria.firebasestorage.app",
  messagingSenderId: "895512565214",
  appId:             "1:895512565214:web:83a09ab251fa250e0f394f"
};

let db   = null;
let auth = null;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded');
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.database();
    // auth는 SDK가 로드된 경우에만 초기화
    if (typeof firebase.auth === 'function') {
      auth = firebase.auth();
    }
    return true;
  } catch(e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

// ── DB 참조 ──
const REF = {
  orders:  () => db.ref('orders'),
  order:   id => db.ref('orders/' + id),
  soldout: () => db.ref('soldout'),
  boothSt: () => db.ref('boothState'),
  seats:   () => db.ref('seats'),
  seat:    id => db.ref('seats/' + id),
  counter: () => db.ref('orderCounter'),
};

// ── 주문번호 채번 ──
async function nextOrderNum() {
  const snap = await REF.counter().transaction(v => (v || 0) + 1);
  return snap.snapshot.val();
}

async function saveOrder(order)         { await REF.order(order.id).set(order); }
async function setSeat(id, data)         { await db.ref('seats/' + id).set(data); }
async function clearSeat(id)             { await db.ref('seats/' + id).remove(); }
async function updateBoothState(id, data){ await db.ref('boothState/' + id).update(data); }
async function setSoldout(key, val) {
  if (val) await db.ref('soldout/' + key).set(true);
  else     await db.ref('soldout/' + key).remove();
}

// ── Firebase Auth 헬퍼 ──
async function signIn(email, password) {
  return await auth.signInWithEmailAndPassword(email, password);
}
async function signOut() {
  return await auth.signOut();
}
function onAuthChange(cb) {
  if (auth) auth.onAuthStateChanged(cb);
}
function currentUser() {
  return auth ? auth.currentUser : null;
}

// ── QR 토큰 (발표용 보안 설명) ──
const QR_SECRET = 'DKU-CAFETERIA-2024';
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
async function generateQRToken(tableId) {
  const raw = `${tableId}:${todayStr()}:${QR_SECRET}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(raw));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
  }
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(16).padStart(8,'0');
}
