/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* File-backed reference data store.
 *
 * ⚠️ REFERENCE ONLY. This is a single-process JSON file so the API can run
 * end-to-end without infrastructure. Swap it for Postgres/Firestore (or any
 * transactional store) before real money or real traffic — the function
 * signatures below are the contract later phases (scores, purchases, rewards,
 * user) are written against, so only this file needs replacing.
 *
 * Every mutation writes through to disk atomically (temp file + rename).
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH
  ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(__dirname, '..', process.env.DB_PATH))
  : path.join(__dirname, '..', 'data', 'dutchkem.db');

const MAX_SCORES_PER_USER = 200;

const _state = {
  users: {},
  scores: [],
  purchases: {},
  rewards: {},
  deletions: [],
  analytics: {},
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyState() {
  return { users: {}, scores: [], purchases: {}, rewards: {}, deletions: [], analytics: {} };
}

function load() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    _state.users = parsed.users && typeof parsed.users === 'object' ? parsed.users : {};
    _state.scores = Array.isArray(parsed.scores) ? parsed.scores : [];
    _state.purchases = parsed.purchases && typeof parsed.purchases === 'object' ? parsed.purchases : {};
    _state.rewards = parsed.rewards && typeof parsed.rewards === 'object' ? parsed.rewards : {};
    _state.deletions = Array.isArray(parsed.deletions) ? parsed.deletions : [];
    _state.analytics = parsed.analytics && typeof parsed.analytics === 'object' ? parsed.analytics : {};

    return _state;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[db] could not read ' + DB_PATH + ' (' + error.message + ') — starting empty');
    }
    return _state;
  }
}

function persist() {
  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(_state, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);

  return DB_PATH;
}

/* ───────── users ───────── */

function getUser(uid) {
  const key = String(uid);
  let user = _state.users[key];

  if (!user) {
    user = {
      coins: 0,
      kobo: 0,
      createdAt: new Date().toISOString(),
      banned: false,
      flagged: false,
    };
    _state.users[key] = user;
    persist();
  }

  return user;
}

function flagUser(uid, reason) {
  const user = getUser(uid);
  user.flagged = true;
  user.flagReason = String(reason || 'unspecified');
  user.flaggedAt = new Date().toISOString();
  persist();
  return user;
}

function banUser(uid, reason) {
  const user = getUser(uid);
  user.banned = true;
  user.banReason = String(reason || 'unspecified');
  user.bannedAt = new Date().toISOString();
  persist();
  return user;
}

function deleteUser(uid) {
  const key = String(uid);

  delete _state.users[key];
  delete _state.rewards[key];
  _state.scores = _state.scores.filter(function (entry) { return entry.uid !== key; });

  _state.deletions.push({ uid: key, at: new Date().toISOString() });
  persist();

  return true;
}

/* ───────── scores ───────── */

function recordScore(uid, score, runId) {
  const key = String(uid);
  const entry = {
    uid: key,
    score: Math.max(0, Math.floor(Number(score) || 0)),
    runId: String(runId),
    at: new Date().toISOString(),
  };

  _state.scores.push(entry);

  // Keep only the newest MAX_SCORES_PER_USER runs per player.
  const mine = _state.scores.filter(function (row) { return row.uid === key; });
  if (mine.length > MAX_SCORES_PER_USER) {
    const drop = mine
      .slice(0, mine.length - MAX_SCORES_PER_USER)
      .map(function (row) { return row.runId; });

    _state.scores = _state.scores.filter(function (row) {
      return !(row.uid === key && drop.indexOf(row.runId) !== -1);
    });
  }

  persist();
  return entry;
}

/* Leaderboard: one row per player (their best run), highest first. */
function getTopScores(limit) {
  const capped = Math.max(1, Math.floor(Number(limit) || 100));
  const best = {};

  _state.scores.forEach(function (row) {
    if (!best[row.uid] || row.score > best[row.uid].score) best[row.uid] = row;
  });

  return Object.keys(best)
    .map(function (uid) { return best[uid]; })
    .sort(function (a, b) { return b.score - a.score; })
    .slice(0, capped);
}

/* ───────── purchases ───────── */

function recordPurchase(txnId, uid, sku, amount, verified) {
  const key = String(txnId);

  _state.purchases[key] = {
    txnId: key,
    uid: String(uid),
    sku: String(sku),
    amount: Math.max(0, Math.floor(Number(amount) || 0)),
    verified: Boolean(verified),
    at: new Date().toISOString(),
  };

  persist();
  return _state.purchases[key];
}

function getPurchase(txnId) {
  return _state.purchases[String(txnId)] || null;
}

/* ───────── rewards ───────── */

function getRewardState(uid) {
  const key = String(uid);
  const day = today();
  let state = _state.rewards[key];

  if (!state || state.date !== day) {
    state = { date: day, count: 0 };
    _state.rewards[key] = state;
    persist();
  }

  return state;
}

function incrementReward(uid) {
  const state = getRewardState(uid);
  state.count += 1;
  state.updatedAt = new Date().toISOString();
  persist();
  return state;
}

/* ───────── analytics ───────── */

/* Aggregate counters only: { event: { count, lastAt } }. No uid is stored, so
 * an erasure request has nothing to remove here and the totals stay useful.
 */
function recordAnalytics(events) {
  const list = Array.isArray(events) ? events : [];
  const at = new Date().toISOString();

  list.forEach(function (entry) {
    const name = String(entry.event);
    const bucket = _state.analytics[name] || { count: 0, lastAt: null };
    bucket.count += 1;
    bucket.lastAt = at;
    _state.analytics[name] = bucket;
  });

  if (list.length > 0) persist();
  return _state.analytics;
}

function getAnalytics() {
  return _state.analytics;
}

load();

module.exports = {
  load: load,
  persist: persist,
  getUser: getUser,
  flagUser: flagUser,
  banUser: banUser,
  deleteUser: deleteUser,
  recordScore: recordScore,
  getTopScores: getTopScores,
  recordPurchase: recordPurchase,
  getPurchase: getPurchase,
  getRewardState: getRewardState,
  incrementReward: incrementReward,
  recordAnalytics: recordAnalytics,
  getAnalytics: getAnalytics,
  DB_PATH: DB_PATH,
  MAX_SCORES_PER_USER: MAX_SCORES_PER_USER,
  _state: _state,
  emptyState: emptyState,
};
