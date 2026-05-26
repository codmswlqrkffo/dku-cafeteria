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
let auth = null;

function initFirebase() {
  if (typeof firebase === 'undefined') { console.warn('Firebase SDK not loaded'); return false; }
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  db   = firebase.database();
  auth = firebase.auth();
  return true;
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

async function saveOrder(order)        { await REF.order(order.id).set(order); }
async function markItemDone(id, idx, v){ await db.ref(`orders/${id}/items/${idx}/done`).set(v); }

function subscribeOrders(cb)   { REF.orders().on('value', s => cb(Object.values(s.val()||{}).sort((a,b)=>b.ts-a.ts))); }
function subscribeSoldout(cb)  { REF.soldout().on('value', s => cb(s.val()||{})); }
function subscribeBoothState(cb){ REF.boothSt().on('value', s => cb(s.val()||{})); }
function subscribeSeats(cb)    { REF.seats().on('value', s => cb(s.val()||{})); }

async function setSoldout(key, val) {
  if (val) await db.ref('soldout/'+key).set(true);
  else     await db.ref('soldout/'+key).remove();
}
async function updateBoothState(id, data){ await db.ref('boothState/'+id).update(data); }
async function setSeat(id, data)         { await db.ref('seats/'+id).set(data); }
async function clearSeat(id)             { await db.ref('seats/'+id).remove(); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  QR 토큰 보안 (날짜 기반 HMAC-like 토큰)
//  - 매일 자정 자동 갱신
//  - 테이블 ID + 날짜를 조합한 고유 토큰
//  - 복사된 QR이 다음날 열리면 무효 처리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const QR_SECRET = 'DKU-CAFETERIA-2024'; // 고정 시크릿 키

// 날짜 문자열 (YYYYMMDD)
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

// 간단한 해시 함수 (SHA 라이브러리 없이 순수 JS)
async function simpleHash(str) {
  // SubtleCrypto API 사용 (브라우저 내장)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 16);
  }
  // fallback: 간단한 문자열 해시
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8,'0');
}

// 토큰 생성: tableId + 오늘날짜 + 시크릿
async function generateQRToken(tableId) {
  const raw = `${tableId}:${todayStr()}:${QR_SECRET}`;
  return await simpleHash(raw);
}

// 토큰 검증
async function verifyQRToken(tableId, token) {
  const expected = await generateQRToken(tableId);
  return token === expected;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Firebase Auth 헬퍼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function signIn(email, password) {
  return await auth.signInWithEmailAndPassword(email, password);
}

async function signOut() {
  return await auth.signOut();
}

function onAuthChange(cb) {
  auth.onAuthStateChanged(cb);
}

function currentUser() {
  return auth ? auth.currentUser : null;
}
