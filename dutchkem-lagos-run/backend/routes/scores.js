/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Score routes.
 *
 *   POST /api/scores/submit     → one finished run (signed, single-use runId)
 *   GET  /api/scores/leaderboard → best run per player, top 100
 *
 * A submission is accepted only when all four gates pass:
 *   1. the player is not banned,
 *   2. score is a finite number ≥ 0,
 *   3. runId is a real identifier (≥ 8 chars) never seen for this player,
 *   4. the HMAC matches, and the score is under the per-run ceiling.
 * Gates 2 and 4 failures flag the account for review rather than silently
 * dropping the run: a mismatch means either a corrupted save or a forged
 * payload, and both are worth knowing about.
 */

const express = require('express');
const config = require('../config');
const db = require('../services/db');
const { requireSession } = require('../middleware/auth');
const { verifyScore } = require('../services/signature');

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const LEADERBOARD_SIZE = 100;

const router = express.Router();

function rankOf(uid) {
  const top = db.getTopScores(1000);
  for (let i = 0; i < top.length; i += 1) {
    if (top[i].uid === uid) return i + 1;
  }
  return top.length + 1;
}

/* POST /submit — body: { score, runId, signature } */
router.post('/submit', requireSession, function (req, res) {
  const uid = req.user.id;
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  const user = db.getUser(uid);
  if (user.banned) {
    return res.status(403).json({
      ok: false,
      error: 'banned',
      message: 'This account is suspended. Scores are not accepted.',
    });
  }

  const rawScore = body.score;
  const score = typeof rawScore === 'number' ? rawScore : Number(rawScore);
  const runId = typeof body.runId === 'string' ? body.runId.trim() : '';
  const signature = typeof body.signature === 'string' ? body.signature.trim() : '';

  if (!Number.isFinite(score) || score < 0) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_score',
      message: 'score must be a finite number greater than or equal to 0.',
    });
  }

  if (!RUN_ID_PATTERN.test(runId)) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_run_id',
      message: 'runId must be 8–64 characters of letters, numbers, underscore or hyphen.',
    });
  }

  if (!verifyScore(uid, score, runId, signature)) {
    const flagged = db.flagUser(uid, 'score_signature_mismatch');
    console.warn('[scores] signature mismatch for ' + uid + ' run ' + runId + ' — flagged: ' + flagged.flagged);
    return res.status(400).json({
      ok: false,
      error: 'invalid_signature',
      message: 'Score signature could not be verified.',
    });
  }

  if (score > config.anticheat.maxScorePerRun) {
    db.flagUser(uid, 'score_above_ceiling');
    console.warn('[scores] ' + uid + ' submitted ' + score + ' above ceiling ' + config.anticheat.maxScorePerRun);
    return res.status(400).json({
      ok: false,
      error: 'score_too_high',
      message: 'This run exceeds the maximum possible score.',
    });
  }

  const duplicate = db._state.scores.some(function (row) {
    return row.uid === uid && row.runId === runId;
  });

  if (duplicate) {
    return res.status(409).json({
      ok: false,
      error: 'duplicate_run',
      message: 'This run has already been submitted.',
    });
  }

  const entry = db.recordScore(uid, Math.floor(score), runId);

  return res.json({
    ok: true,
    score: entry.score,
    runId: entry.runId,
    rank: rankOf(uid),
    top: db.getTopScores(10),
  });
});

/* GET /leaderboard */
router.get('/leaderboard', function (req, res) {
  const limit = req.query.limit === undefined ? LEADERBOARD_SIZE : Number(req.query.limit);
  const size = Number.isFinite(limit) ? Math.min(LEADERBOARD_SIZE, Math.max(1, Math.floor(limit))) : LEADERBOARD_SIZE;

  res.set('Cache-Control', 'public, max-age=30');
  return res.json({
    ok: true,
    top: db.getTopScores(size),
    size: size,
    updatedAt: new Date().toISOString(),
  });
});

module.exports = {
  router: router,
  LEADERBOARD_SIZE: LEADERBOARD_SIZE,
};
