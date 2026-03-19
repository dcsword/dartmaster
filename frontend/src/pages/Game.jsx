import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../utils/api";

const MULTIPLIERS = [
  { value: 1, label: "Single", short: "S" },
  { value: 2, label: "Double", short: "D" },
  { value: 3, label: "Triple", short: "T" },
];

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const meta = location.state || {};

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Current turn state
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentPlayerInTeam, setCurrentPlayerInTeam] = useState(0);
  const [darts, setDarts] = useState([]); // array of { display, value, score }
  const [multiplier, setMultiplier] = useState(1);
  const [inputVal, setInputVal] = useState("");
  const [checkout, setCheckout] = useState(null);
  const [lastTurn, setLastTurn] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [legResult, setLegResult] = useState(null); // { legWon, setWon, winnerName }

  useEffect(() => {
    api
      .getGame(id)
      .then((g) => {
        setGame(g);
        setLoading(false);
      })
      .catch(() => setError("Game not found"));
  }, [id]);

  // Get checkout suggestion when score changes
  useEffect(() => {
    if (!game) return;
    const score = currentScore();
    if (score <= 170 && score > 1) {
      api
        .getCheckout(id, score, game.ruleset)
        .then((r) => setCheckout(r.suggestion))
        .catch(() => { });
    } else {
      setCheckout(null);
    }
  }, [game, currentPlayerIdx, currentTeamIdx, darts]);

  function currentScore() {
    if (!game) return 501;
    if (game.mode === "singles") {
      const p = game.players?.[currentPlayerIdx];
      const base = p?.score ?? 501;
      const spent = darts.reduce((s, d) => s + d.score, 0);
      return base - spent;
    } else {
      const t = game.teams?.[currentTeamIdx];
      const base = t?.score ?? 501;
      const spent = darts.reduce((s, d) => s + d.score, 0);
      return base - spent;
    }
  }

  function getCurrentPlayer() {
    if (!game) return null;
    if (game.mode === "singles") return game.players?.[currentPlayerIdx];
    const team = game.teams?.[currentTeamIdx];
    return team?.players?.[currentPlayerInTeam];
  }

  function getCurrentTeam() {
    if (!game || game.mode !== "teams") return null;
    return game.teams?.[currentTeamIdx];
  }

  function addDart(scoreVal, mult, isBull = false) {
    if (darts.length >= 3) return;
    const score = isBull ? (mult === 2 ? 50 : 25) : scoreVal * mult;
    const remaining = currentScore();

    if (score > remaining) {
      setError(`Score ${score} exceeds remaining ${remaining}`);
      setTimeout(() => setError(""), 2000);
      return;
    }

    let display;
    if (isBull) display = mult === 2 ? "Bull" : "25";
    else if (mult === 1) display = `${scoreVal}`;
    else if (mult === 2) display = `D${scoreVal}`;
    else display = `T${scoreVal}`;

    setDarts((prev) => [
      ...prev,
      {
        display,
        value: display,
        score,
        baseValue: scoreVal,
        multiplier: mult,
        isBull,
      },
    ]);
    setInputVal("");
    setError("");
  }

  function advanceTurn() {
    if (game.mode === 'singles') {
      setCurrentPlayerIdx(prev => (prev + 1) % game.players.length);
    } else {
      const nextTeamIdx = (currentTeamIdx + 1) % game.teams.length;
      if (nextTeamIdx === 0) {
        setCurrentPlayerInTeam(prev => (prev + 1) % game.teams[0].players.length);
      }
      setCurrentTeamIdx(nextTeamIdx);
    }
  }

  function handleMiss() {
    addDart(0, 1);
  }

  function handleNumpad(n) {
    const next = inputVal + n;
    const num = parseInt(next);
    if (num > 20) return;
    setInputVal(next);
    if (next.length === 2 || num === 20 || num === 0) {
      addDart(num, multiplier);
      setInputVal("");
    }
  }

  function handleSingleDigit() {
    if (!inputVal) return;
    addDart(parseInt(inputVal), multiplier);
    setInputVal("");
  }

  function undoDart() {
    setDarts((prev) => prev.slice(0, -1));
    setInputVal("");
  }

  async function submitTurn(dartOverride) {
    const dartsToSubmit = dartOverride || darts;
    if (dartsToSubmit.length === 0) return;
    setSubmitting(true);
    setError("");

    try {
      const player = getCurrentPlayer();
      const team = getCurrentTeam();
      const body = {
        darts: dartsToSubmit.map(d => {
          if (d.isBull) return d.value;        // 'Bull' or '25'
          if (d.multiplier === 2) return d.value;  // 'D16' etc
          if (d.multiplier === 3) return d.value;  // 'T20' etc
          return d.score;                       // plain number: 6, 20 etc
        }),
        playerId: player?.id,
        teamId: team?.id,
      };

      const result = await api.submitTurn(id, body);
      setLastTurn(result);

      if (result.gameStatus === 'finished') {
        navigate(`/win/${id}`, {
          state: { winnerName: player?.name, teamName: team?.name, result },
        });
        return;
      }

      // Leg won but match not over — show leg result overlay
      if (result.legWon) {
        const updated = await api.getGame(id);
        setGame(updated);
        setDarts([]);
        setInputVal('');
        setMultiplier(1);
        setLegResult({
          legWon: true,
          setWon: result.setWon,
          winnerName: player?.name || team?.name,
          updatedGame: updated,
        });
        return;
      }

      // Refresh game state
      const updated = await api.getGame(id);
      setGame(updated);
      setDarts([]);
      setInputVal("");
      setMultiplier(1);

      // Advance turn
      advanceTurn();

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBust() {
    // Submit 0-scoring turn
    setSubmitting(true);
    try {
      const player = getCurrentPlayer();
      const team = getCurrentTeam();
      await api.submitTurn(id, {
        darts: darts.length > 0 ? darts.map((d) => d.value) : ["0"],
        playerId: player?.id,
        teamId: team?.id,
      });
      const updated = await api.getGame(id);
      setGame(updated);
      setDarts([]);
      setInputVal("");
      advanceTurn();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--muted)",
        }}
      >
        Loading game...
      </div>
    );
  if (!game)
    return (
      <div style={{ padding: "24px", color: "var(--danger)" }}>
        {error || "Game not found"}
      </div>
    );

  const remaining = currentScore();
  const player = getCurrentPlayer();
  const team = getCurrentTeam();

  // Leg result overlay
  if (legResult) {
    const g = legResult.updatedGame;
    const multiSet = g?.sets_per_match > 1;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '20px', background: 'var(--bg)' }}>
        <div style={{ fontSize: '60px' }}>🎯</div>
        <div>
          <h2 style={{ fontSize: '36px', color: 'var(--accent)', lineHeight: 1, marginBottom: '6px' }}>{legResult.winnerName}</h2>
          <p style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 500 }}>
            {legResult.setWon ? 'wins the set!' : 'wins the leg!'}
          </p>
        </div>

        {/* Score summary */}
        <div className="card" style={{ width: '100%', maxWidth: '360px', padding: '16px' }}>
          {multiSet && (
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>SETS</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {g.mode === 'singles'
                  ? g.players?.map(p => (
                    <div key={p.id} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>{p.name}</p>
                      <p style={{ fontSize: '28px', fontFamily: 'Bebas Neue', color: 'var(--text)' }}>{p.sets_won}</p>
                    </div>
                  ))
                  : g.teams?.map(t => (
                    <div key={t.id} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>{t.name}</p>
                      <p style={{ fontSize: '28px', fontFamily: 'Bebas Neue', color: 'var(--text)' }}>{t.sets_won}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          <div>
            <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>LEGS THIS SET</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {g.mode === 'singles'
                ? g.players?.map(p => (
                  <div key={p.id} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>{p.name}</p>
                    <p style={{ fontSize: '28px', fontFamily: 'Bebas Neue', color: 'var(--text)' }}>{p.legs_won}</p>
                  </div>
                ))
                : g.teams?.map(t => (
                  <div key={t.id} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>{t.name}</p>
                    <p style={{ fontSize: '28px', fontFamily: 'Bebas Neue', color: 'var(--text)' }}>{t.legs_won}</p>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <button className="btn-primary" style={{ maxWidth: '360px', width: '100%', fontSize: '16px', padding: '16px' }}
          onClick={() => {
            setLegResult(null);
            advanceTurn();
          }}>
          {legResult.setWon ? `Start set ${g.current_set} →` : `Start leg ${g.current_leg} →`}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--accent)' }}>501</h1>
        <span style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.08em' }}>
          {game.ruleset.replace('_', ' ').toUpperCase()}
        </span>
        <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '12px' }}>
          ✕ Quit
        </button>
      </div>

      {/* Match status bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
        {game.sets_per_match > 1 && (
          <>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Set <strong style={{ color: 'var(--text)' }}>{game.current_set}</strong>/{game.sets_per_match}
            </span>
            <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
          </>
        )}
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
          Leg <strong style={{ color: 'var(--text)' }}>{game.current_leg}</strong>/{game.legs_per_set}
        </span>
        <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
          {game.format === 'best_of' ? 'Best of' : 'First to'}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Round {(game.recentRounds?.length || 0) + 1}</span>
      </div>

      {/* Scoreboard */}
      <div className="card" style={{ padding: "12px" }}>
        {game.mode === "singles" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${game.players.length}, 1fr)`,
              gap: "8px",
            }}
          >
            {game.players.map((p, i) => {
              const active = i === currentPlayerIdx;
              return (
                <div
                  key={p.id}
                  style={{
                    textAlign: "center",
                    padding: "10px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: active ? "var(--surface)" : "transparent",
                    border: active
                      ? "1px solid var(--accent)"
                      : "1px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: active ? "var(--accent)" : "var(--muted)",
                      marginBottom: "4px",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {active ? "▶ " : ""}
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontFamily: "Bebas Neue",
                      color: active ? "var(--text)" : "var(--muted)",
                      lineHeight: 1,
                    }}
                  >
                    {i === currentPlayerIdx ? remaining : p.score}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${game.teams.length}, 1fr)`,
              gap: "8px",
            }}
          >
            {game.teams.map((t, ti) => {
              const active = ti === currentTeamIdx;
              return (
                <div
                  key={t.id}
                  style={{
                    textAlign: "center",
                    padding: "10px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: active ? "var(--surface)" : "transparent",
                    border: active
                      ? "1px solid var(--accent)"
                      : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: active ? "var(--accent)" : "var(--muted)",
                      marginBottom: "2px",
                      fontWeight: 500,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontFamily: "Bebas Neue",
                      lineHeight: 1,
                      color: active ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {ti === currentTeamIdx ? remaining : t.score}
                  </div>
                  {active && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--muted)",
                        marginTop: "2px",
                      }}
                    >
                      {player?.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current turn */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>
            {team ? `${team.name} · ` : ""}
            {player?.name} — dart {darts.length + 1} of 3
          </span>
          <span
            style={{
              fontFamily: "Bebas Neue",
              fontSize: "20px",
              color: remaining <= 170 ? "var(--accent2)" : "var(--text)",
            }}
          >
            {remaining}
          </span>
        </div>

        {/* Dart slots */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "10px 6px",
                borderRadius: "var(--radius-sm)",
                background: darts[i] ? "var(--surface)" : "var(--bg3)",
                border: `1px solid ${darts[i] ? "var(--accent)" : "var(--border)"
                  }`,
                textAlign: "center",
                fontSize: "15px",
                fontWeight: 600,
                color: darts[i] ? "var(--text)" : "var(--muted)",
                transition: "all 0.15s",
              }}
            >
              {darts[i] ? darts[i].display : "—"}
            </div>
          ))}
        </div>

        {/* Checkout suggestion */}
        {checkout && darts.length === 0 && (
          <div
            style={{
              background: "rgba(232,89,60,0.1)",
              border: "1px solid rgba(232,89,60,0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              marginBottom: "12px",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              🎯 Checkout:{" "}
            </span>
            <span style={{ color: "var(--text)" }}>{checkout.join(" → ")}</span>
          </div>
        )}

        {/* Multiplier selector */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
          {MULTIPLIERS.map((m) => (
            <button
              key={m.value}
              className={`btn-multiplier ${multiplier === m.value ? 'active' : ''}`}
              onClick={() => setMultiplier(m.value)}
            >
              {m.short}
            </button>
          ))}
        </div>

        {/* Input preview */}
        {inputVal && (
          <div
            style={{
              textAlign: "center",
              fontSize: "28px",
              fontFamily: "Bebas Neue",
              color: "var(--accent)",
              marginBottom: "8px",
            }}
          >
            {multiplier > 1
              ? MULTIPLIERS.find((m) => m.value === multiplier).short
              : ""}
            {inputVal}
          </div>
        )}

        {/* Number pad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          {[
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20,
          ].map((n) => (
            <button
              key={n} className="btn-numpad"
              onClick={() => addDart(n, multiplier)}
              disabled={darts.length >= 3 || n * multiplier > remaining}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Special buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          <button
            className="btn-special"
            onClick={handleMiss}
            disabled={darts.length >= 3}
          >
            Miss
          </button>
          <button
            className="btn-bull25"
            onClick={() => addDart(25, 1, true)}
            disabled={darts.length >= 3 || 25 > remaining}
          >
            Bull 25
          </button>
          <button
            className="btn-bull50"
            onClick={() => addDart(50, 2, true)}
            disabled={darts.length >= 3 || 50 > remaining}
          >
            Bull 50
          </button>
          <button
            className="btn-special"
            onClick={undoDart}
            disabled={darts.length === 0}
          >
            ↩ Undo
          </button>
        </div>

        {error && (
          <p
            style={{
              color: "var(--danger)",
              fontSize: "13px",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* Submit / Bust */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          <button
            className="btn-bust"
            onClick={handleBust}
          >
            BUST
          </button>
          <button
            className={`btn-submit ${darts.length > 0 ? 'ready' : 'waiting'}`}
            onClick={() => submitTurn()}
            disabled={darts.length === 0 || submitting}
          >
            {submitting
              ? "..."
              : darts.length === 3
                ? "NEXT PLAYER →"
                : `DONE (${darts.length}/3)`}
          </button>
        </div>
      </div>

      {/* Last turn result */}
      {lastTurn && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            textAlign: "center",
            padding: "8px",
          }}
        >
          {lastTurn.turnResult?.isBust ? (
            <span style={{ color: "var(--danger)" }}>
              💥 BUST — score reset
            </span>
          ) : (
            <span>
              Last turn:{" "}
              {lastTurn.turnResult?.parsedDarts
                ?.map((d) => d.score)
                .join(" + ")}{" "}
              ={" "}
              {lastTurn.turnResult?.parsedDarts?.reduce(
                (s, d) => s + d.score,
                0
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
