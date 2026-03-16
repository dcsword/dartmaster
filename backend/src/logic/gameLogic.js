/**
 * DartMaster — 501 Game Logic
 * All rule enforcement lives here. The API routes call these functions
 * and never make rule decisions themselves.
 */

// ─── Checkout table: score → optimal finish ────────────────────────────────
// Pre-built for every finishing score 2–170.
// Format: array of dart strings e.g. ['T20', 'T20', 'D20']
const CHECKOUTS = {
  170: ['T20', 'T20', 'Bull'],
  167: ['T20', 'T19', 'Bull'],
  164: ['T20', 'T18', 'Bull'],
  161: ['T20', 'T17', 'Bull'],
  160: ['T20', 'T20', 'D20'],
  158: ['T20', 'T20', 'D19'],
  157: ['T20', 'T19', 'D20'],
  156: ['T20', 'T20', 'D18'],
  155: ['T20', 'T19', 'D19'],
  154: ['T20', 'T18', 'D20'],
  153: ['T20', 'T19', 'D18'],
  152: ['T20', 'T20', 'D16'],
  151: ['T20', 'T17', 'D20'],
  150: ['T20', 'T18', 'D18'],
  149: ['T20', 'T19', 'D16'],
  148: ['T20', 'T16', 'D20'],
  147: ['T20', 'T17', 'D18'],
  146: ['T20', 'T18', 'D16'],
  145: ['T20', 'T15', 'D20'],
  144: ['T20', 'T20', 'D12'],
  143: ['T20', 'T17', 'D16'],
  142: ['T20', 'T14', 'D20'],
  141: ['T20', 'T15', 'D18'],
  140: ['T20', 'T20', 'D10'],
  139: ['T20', 'T13', 'D20'],
  138: ['T20', 'T14', 'D18'],
  137: ['T20', 'T15', 'D16'],
  136: ['T20', 'T20', 'D8'],
  135: ['T20', 'T13', 'D18'],
  134: ['T20', 'T14', 'D16'],
  133: ['T20', 'T11', 'D20'],
  132: ['T20', 'T16', 'D12'],
  131: ['T20', 'T13', 'D16'],
  130: ['T20', 'T18', 'D8'],
  129: ['T19', 'T16', 'D12'],
  128: ['T20', 'T16', 'D10'],
  127: ['T20', 'T17', 'D8'],
  126: ['T19', 'T15', 'D12'],
  125: ['T20', 'T15', 'D10'],
  124: ['T20', 'T14', 'D11'],
  123: ['T19', 'T14', 'D12'],
  122: ['T18', 'T16', 'D11'],
  121: ['T20', 'T11', 'D14'],
  120: ['T20', 'S20', 'D20'],
  119: ['T19', 'T12', 'D13'],
  118: ['T20', 'S18', 'D20'],
  117: ['T20', 'S17', 'D20'],
  116: ['T20', 'S16', 'D20'],
  115: ['T20', 'S15', 'D20'],
  114: ['T20', 'S14', 'D20'],
  113: ['T20', 'S13', 'D20'],
  112: ['T20', 'S12', 'D20'],
  111: ['T20', 'S11', 'D20'],
  110: ['T20', 'S10', 'D20'],
  109: ['T20', 'S9', 'D20'],
  108: ['T20', 'S8', 'D20'],
  107: ['T20', 'S7', 'D20'],
  106: ['T20', 'S6', 'D20'],
  105: ['T20', 'S5', 'D20'],
  104: ['T20', 'S4', 'D20'],
  103: ['T20', 'S3', 'D20'],
  102: ['T20', 'S2', 'D20'],
  101: ['T20', 'S1', 'D20'],
  100: ['T20', 'D20'],
  99: ['T19', 'S10', 'D16'],
  98: ['T20', 'D19'],
  97: ['T19', 'D20'],
  96: ['T20', 'D18'],
  95: ['T19', 'D19'],
  94: ['T18', 'D20'],
  93: ['T19', 'D18'],
  92: ['T20', 'D16'],
  91: ['T17', 'D20'],
  90: ['T18', 'D18'],
  89: ['T19', 'D16'],
  88: ['T16', 'D20'],
  87: ['T17', 'D18'],
  86: ['T18', 'D16'],
  85: ['T15', 'D20'],
  84: ['T20', 'D12'],
  83: ['T17', 'D16'],
  82: ['T14', 'D20'],
  81: ['T19', 'D12'],
  80: ['T20', 'D10'],
  79: ['T13', 'D20'],
  78: ['T18', 'D12'],
  77: ['T19', 'D10'],
  76: ['T20', 'D8'],
  75: ['T17', 'D12'],
  74: ['T14', 'D16'],
  73: ['T19', 'D8'],
  72: ['T16', 'D12'],
  71: ['T13', 'D16'],
  70: ['T18', 'D8'],
  69: ['T19', 'D6'],
  68: ['T20', 'D4'],
  67: ['T17', 'D8'],
  66: ['T10', 'D18'],
  65: ['T19', 'D4'],
  64: ['T16', 'D8'],
  63: ['T13', 'D12'],
  62: ['T10', 'D16'],
  61: ['T15', 'D8'],
  60: ['S20', 'D20'],
  59: ['S19', 'D20'],
  58: ['S18', 'D20'],
  57: ['S17', 'D20'],
  56: ['S16', 'D20'],
  55: ['S15', 'D20'],
  54: ['S14', 'D20'],
  53: ['S13', 'D20'],
  52: ['S12', 'D20'],
  51: ['S11', 'D20'],
  50: ['Bull'],
  49: ['S9', 'D20'],
  48: ['S16', 'D16'],
  47: ['S15', 'D16'],
  46: ['S14', 'D16'],
  45: ['S13', 'D16'],
  44: ['S12', 'D16'],
  43: ['S11', 'D16'],
  42: ['S10', 'D16'],
  41: ['S9', 'D16'],
  40: ['D20'],
  39: ['S7', 'D16'],
  38: ['D19'],
  37: ['S5', 'D16'],
  36: ['D18'],
  35: ['S3', 'D16'],
  34: ['D17'],
  33: ['S1', 'D16'],
  32: ['D16'],
  31: ['S15', 'D8'],
  30: ['D15'],
  29: ['S13', 'D8'],
  28: ['D14'],
  27: ['S11', 'D8'],
  26: ['D13'],
  25: ['S9', 'D8'],
  24: ['D12'],
  23: ['S7', 'D8'],
  22: ['D11'],
  21: ['S5', 'D8'],
  20: ['D10'],
  19: ['S3', 'D8'],
  18: ['D9'],
  17: ['S1', 'D8'],
  16: ['D8'],
  15: ['S7', 'D4'],
  14: ['D7'],
  13: ['S5', 'D4'],
  12: ['D6'],
  11: ['S3', 'D4'],
  10: ['D5'],
  9: ['S1', 'D4'],
  8: ['D4'],
  7: ['S3', 'D2'],
  6: ['D3'],
  5: ['S1', 'D2'],
  4: ['D2'],
  3: ['S1', 'D1'],
  2: ['D1'],
};

// ─── Dart value parsing ─────────────────────────────────────────────────────

/**
 * Parse a dart entry into { score, multiplier, isBull }
 * Accepts: number (raw score), or string like 'T20', 'D16', 'S5', 'Bull', '25'
 */
export function parseDart(input) {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    if (input === 50) return { score: 50, multiplier: 2, isBull: true };
    if (input === 25) return { score: 25, multiplier: 1, isBull: true };
    if (input < 0 || input > 60) throw new Error(`Invalid dart score: ${input}`);
    return { score: input, multiplier: 1, isBull: false };
  }

  const str = String(input).trim().toUpperCase();

  if (str === 'BULL' || str === '50') return { score: 50, multiplier: 2, isBull: true };
  if (str === '25') return { score: 25, multiplier: 1, isBull: true };
  if (str === '0' || str === 'MISS') return { score: 0, multiplier: 1, isBull: false };

  const match = str.match(/^([SDT])(\d+)$/);
  if (!match) throw new Error(`Cannot parse dart value: "${input}"`);

  const [, prefix, numStr] = match;
  const num = parseInt(numStr, 10);
  if (num < 1 || num > 20) throw new Error(`Dart number out of range: ${num}`);

  const multiplier = { S: 1, D: 2, T: 3 }[prefix];
  const score = num * multiplier;
  if (score > 60) throw new Error(`Dart score too high: ${score}`);

  return { score, multiplier, isBull: false };
}

// ─── Score validation ───────────────────────────────────────────────────────

/**
 * Check whether a dart score is valid given remaining score and game rules.
 * Returns { valid: bool, reason?: string }
 */
export function validateDart(dartInput, remainingScore, ruleset) {
  let dart;
  try {
    dart = parseDart(dartInput);
  } catch (e) {
    return { valid: false, reason: e.message };
  }

  if (dart.score > remainingScore) {
    return { valid: false, reason: `Score ${dart.score} exceeds remaining ${remainingScore}` };
  }

  return { valid: true, dart };
}

// ─── Bust detection ─────────────────────────────────────────────────────────

/**
 * After a full turn, determine if it's a bust.
 * A bust resets the player's score to score_before.
 */
export function isBust(scoreAfterTurn, ruleset) {
  if (scoreAfterTurn < 0) return true;
  if (scoreAfterTurn === 1) return true; // Can never finish on 1 with any ruleset

  if (ruleset === 'double_out' && scoreAfterTurn > 0) return false; // only bust if last dart not double (checked at win)
  if (ruleset === 'triple_out' && scoreAfterTurn > 0) return false;

  return false;
}

/**
 * Check if the finishing dart is valid for the ruleset.
 * Only called when scoreAfterTurn === 0.
 */
export function isValidCheckout(lastDart, ruleset) {
  const dart = parseDart(lastDart);

  if (ruleset === 'straight_out') return true;

  if (ruleset === 'double_out') {
    return dart.multiplier === 2 || dart.isBull; // Bull counts as double bull
  }

  if (ruleset === 'triple_out') {
    return dart.multiplier === 3;
  }

  return true;
}

// ─── Turn processor ─────────────────────────────────────────────────────────

/**
 * Process a complete turn (up to 3 darts).
 *
 * @param {number} scoreBefore - Player's score at start of turn
 * @param {Array}  darts       - Array of dart values (1–3 entries)
 * @param {string} ruleset     - 'straight_out' | 'double_out' | 'triple_out'
 * @returns {object} Turn result
 */
export function processTurn(scoreBefore, darts, ruleset) {
  if (!darts || darts.length === 0) throw new Error('At least one dart required');
  if (darts.length > 3) throw new Error('Maximum 3 darts per turn');

  const parsedDarts = [];
  let runningScore = scoreBefore;

  for (let i = 0; i < darts.length; i++) {
    const dart = parseDart(darts[i]);

    if (dart.score > runningScore) {
      // Exceeded remaining — bust immediately
      return {
        isBust: true,
        isWin: false,
        scoreAfter: scoreBefore,
        dartsThrown: i + 1,
        parsedDarts,
        reason: `Dart ${i + 1} (${dart.score}) exceeded remaining score (${runningScore})`,
      };
    }

    runningScore -= dart.score;
    parsedDarts.push(dart);

    if (runningScore === 0) {
      // Potential win — check checkout rule
      if (!isValidCheckout(darts[i], ruleset)) {
        return {
          isBust: true,
          isWin: false,
          scoreAfter: scoreBefore,
          dartsThrown: i + 1,
          parsedDarts,
          reason: `Must finish on a ${ruleset === 'double_out' ? 'double' : 'triple'}`,
        };
      }
      return {
        isBust: false,
        isWin: true,
        scoreAfter: 0,
        dartsThrown: i + 1,
        parsedDarts,
        checkoutDart: darts[i],
      };
    }

    if (runningScore === 1 && ruleset !== 'straight_out') {
      // Unreachable finish — bust
      return {
        isBust: true,
        isWin: false,
        scoreAfter: scoreBefore,
        dartsThrown: i + 1,
        parsedDarts,
        reason: 'Score of 1 remaining is a bust',
      };
    }
  }

  return {
    isBust: false,
    isWin: false,
    scoreAfter: runningScore,
    dartsThrown: parsedDarts.length,
    parsedDarts,
  };
}

// ─── Checkout suggestions ────────────────────────────────────────────────────

/**
 * Get checkout suggestion for a given remaining score.
 * Returns array of dart strings, or null if no checkout possible.
 */
export function getCheckout(remaining, ruleset = 'double_out') {
  if (remaining > 170 || remaining < 2) return null;
  if (remaining === 169 || remaining === 168 || remaining === 166 || remaining === 165 || remaining === 163 || remaining === 162 || remaining === 159) return null;

  const suggestion = CHECKOUTS[remaining];
  if (!suggestion) return null;

  // For straight_out, last dart doesn't need to be a double — suggest simpler finishes
  if (ruleset === 'straight_out') {
    if (remaining <= 60) return [`S${remaining}`];
    if (remaining <= 40 && remaining % 2 === 0) return [`D${remaining / 2}`];
  }

  // For triple_out, only suggest if last dart is a triple
  if (ruleset === 'triple_out') {
    const last = suggestion[suggestion.length - 1];
    if (!last.startsWith('T')) return null; // No known triple finish
  }

  return suggestion;
}

// ─── Player rotation ─────────────────────────────────────────────────────────

/**
 * Given current player index and total players, return next player index.
 */
export function nextPlayerIndex(currentIndex, totalPlayers) {
  return (currentIndex + 1) % totalPlayers;
}

/**
 * In team mode: given current team and player within team, advance to next.
 */
export function nextTeamPlayer(currentTeamIndex, currentPlayerInTeam, teams) {
  const team = teams[currentTeamIndex];
  const nextPlayerInTeam = (currentPlayerInTeam + 1) % team.players.length;

  if (nextPlayerInTeam === 0) {
    // All players in this team threw — move to next team
    const nextTeam = (currentTeamIndex + 1) % teams.length;
    return { teamIndex: nextTeam, playerInTeam: 0 };
  }

  return { teamIndex: currentTeamIndex, playerInTeam: nextPlayerInTeam };
}

// ─── Stats helpers ───────────────────────────────────────────────────────────

export function calcAvgPerDart(totalScore, totalDarts) {
  if (totalDarts === 0) return 0;
  return Math.round((totalScore / totalDarts) * 10) / 10;
}

export function calcAvgPerRound(totalScore, totalRounds) {
  if (totalRounds === 0) return 0;
  return Math.round((totalScore / totalRounds) * 10) / 10;
}
