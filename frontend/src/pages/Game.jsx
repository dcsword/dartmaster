import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

const MULTIPLIERS = [
  { value: 1, short: "S" },
  { value: 2, short: "D" },
  { value: 3, short: "T" },
];

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentPlayerInTeam, setCurrentPlayerInTeam] = useState(0);
  const [darts, setDarts] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [checkout, setCheckout] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [legResult, setLegResult] = useState(null);
  const [legStarterIdx, setLegStarterIdx] = useState(0);

  useEffect(() => {
    api.getGame(id).then(g => { setGame(g); setLoading(false); }).catch(() => setError("Game not found"));
  }, [id]);

  useEffect(() => {
    if (!game) return;
    const score = currentScore();
    if (score <= 170 && score > 1) {
      api.getCheckout(id, score, game.ruleset).then(r => setCheckout(r.suggestion)).catch(() => {});
    } else setCheckout(null);
  }, [game, currentPlayerIdx, currentTeamIdx, darts]);

  function currentScore() {
    if (!game) return 501;
    if (game.mode === "singles") {
      const p = game.players?.[currentPlayerIdx];
      return (p?.score ?? 501) - darts.reduce((s, d) => s + d.score, 0);
    }
    const t = game.teams?.[currentTeamIdx];
    return (t?.score ?? 501) - darts.reduce((s, d) => s + d.score, 0);
  }

  function getCurrentPlayer() {
    if (!game) return null;
    if (game.mode === "singles") return game.players?.[currentPlayerIdx];
    return game.teams?.[currentTeamIdx]?.players?.[currentPlayerInTeam];
  }

  function getCurrentTeam() {
    if (!game || game.mode !== "teams") return null;
    return game.teams?.[currentTeamIdx];
  }

  function addDart(scoreVal, mult, isBull = false) {
    if (darts.length >= 3) return;
    const rem = currentScore();
    if (isBull) {
      const score = scoreVal === 50 ? 50 : 25;
      const display = scoreVal === 50 ? "Bull" : "25";
      if (score > rem) { setError(`${score} exceeds ${rem}`); setTimeout(() => setError(""), 2000); return; }
      setDarts(prev => [...prev, { display, value: display, score, multiplier: 1, isBull: true }]);
      setError(""); return;
    }
    const score = scoreVal * mult;
    if (score > rem) { setError(`${score} exceeds ${rem}`); setTimeout(() => setError(""), 2000); return; }
    const display = mult === 1 ? `${scoreVal}` : mult === 2 ? `D${scoreVal}` : `T${scoreVal}`;
    setDarts(prev => [...prev, { display, value: display, score, multiplier: mult, isBull: false }]);
    setError("");
  }

  function advanceTurn() {
    if (game.mode === "singles") {
      setCurrentPlayerIdx(prev => (prev + 1) % game.players.length);
    } else {
      const nextTeamIdx = (currentTeamIdx + 1) % game.teams.length;
      if (nextTeamIdx === 0) setCurrentPlayerInTeam(prev => (prev + 1) % game.teams[0].players.length);
      setCurrentTeamIdx(nextTeamIdx);
    }
  }

  function undoDart() { setDarts(prev => prev.slice(0, -1)); }

  async function submitTurn() {
    if (darts.length === 0) return;
    setSubmitting(true); setError("");
    try {
      const player = getCurrentPlayer();
      const team = getCurrentTeam();
      const result = await api.submitTurn(id, {
        darts: darts.map(d => (d.isBull || d.multiplier === 2 || d.multiplier === 3) ? d.value : d.score),
        playerId: player?.id, teamId: team?.id,
      });
      if (result.gameStatus === "finished") {
        navigate(`/win/${id}`, { state: { winnerName: player?.name, teamName: team?.name, result } });
        return;
      }
      if (result.legWon) {
        const updated = await api.getGame(id);
        setGame(updated); setDarts([]); setMultiplier(1);
        setLegResult({ setWon: result.setWon, winnerName: player?.name || team?.name, updatedGame: updated });
        return;
      }
      const updated = await api.getGame(id);
      setGame(updated); setDarts([]); setMultiplier(1);
      advanceTurn();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleBust() {
    setSubmitting(true);
    try {
      const player = getCurrentPlayer(); const team = getCurrentTeam();
      await api.submitTurn(id, {
        darts: darts.length > 0 ? darts.map(d => d.value) : ["0"],
        playerId: player?.id, teamId: team?.id,
      });
      const updated = await api.getGame(id);
      setGame(updated); setDarts([]); setMultiplier(1); advanceTurn();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="page-loading">Loading game...</div>;
  if (!game) return <div className="page-error">{error || "Game not found"}</div>;

  const remaining = currentScore();
  const player = getCurrentPlayer();
  const team = getCurrentTeam();

  // ── Leg result overlay ──────────────────────────────────────────────────────
  if (legResult) {
    const g = legResult.updatedGame;
    const multiSet = g?.sets_per_match > 1;
    const currentSetNumber = g?.current_set;
    const legsInSet = g?.legs?.filter(l => l.set_number === currentSetNumber && l.finished_at) || [];
    function legsWon(entityId, mode) {
      return legsInSet.filter(l => mode === "singles" ? l.winner_id === entityId : l.winner_team_id === entityId).length;
    }
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", gap: "20px" }}>
        <div style={{ fontSize: "56px" }}>🎯</div>
        <div>
          <h2 style={{ fontFamily: "Barlow Condensed", fontSize: "40px", fontWeight: 800, color: "var(--accent)", lineHeight: 1, marginBottom: "6px" }}>{legResult.winnerName}</h2>
          <p style={{ color: "var(--text)", fontSize: "16px", fontWeight: 500 }}>{legResult.setWon ? "wins the set!" : "wins the leg!"}</p>
        </div>
        <div className="card" style={{ width: "100%", maxWidth: "360px" }}>
          {multiSet && (
            <div style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
              <div className="label-xs" style={{ marginBottom: "10px" }}>Sets</div>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                {g.mode === "singles"
                  ? g.players?.map(p => (<div key={p.id} style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "3px" }}>{p.name}</div><div style={{ fontFamily: "Barlow Condensed", fontSize: "32px", fontWeight: 800, color: "var(--text)" }}>{p.sets_won}</div></div>))
                  : g.teams?.map(t => (<div key={t.id} style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "3px" }}>{t.name}</div><div style={{ fontFamily: "Barlow Condensed", fontSize: "32px", fontWeight: 800, color: "var(--text)" }}>{t.sets_won}</div></div>))
                }
              </div>
            </div>
          )}
          <div>
            <div className="label-xs" style={{ marginBottom: "10px" }}>Legs this set</div>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              {g.mode === "singles"
                ? g.players?.map(p => (<div key={p.id} style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "3px" }}>{p.name}</div><div style={{ fontFamily: "Barlow Condensed", fontSize: "32px", fontWeight: 800, color: "var(--text)" }}>{legsWon(p.id, "singles")}</div></div>))
                : g.teams?.map(t => (<div key={t.id} style={{ textAlign: "center" }}><div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "3px" }}>{t.name}</div><div style={{ fontFamily: "Barlow Condensed", fontSize: "32px", fontWeight: 800, color: "var(--text)" }}>{legsWon(t.id, "teams")}</div></div>))
              }
            </div>
          </div>
        </div>
        <button className="btn-primary" style={{ maxWidth: "360px", width: "100%", fontFamily: "Barlow Condensed", fontSize: "18px", fontWeight: 700 }}
          onClick={() => {
            const total = game.mode === "singles" ? game.players.length : game.teams.length;
            const next = (legStarterIdx + 1) % total;
            setLegStarterIdx(next);
            if (game.mode === "singles") setCurrentPlayerIdx(next);
            else { setCurrentTeamIdx(next); setCurrentPlayerInTeam(0); }
            setLegResult(null);
          }}>
          {legResult.setWon ? `START SET ${g.current_set} →` : `START LEG ${g.current_leg} →`}
        </button>
      </div>
    );
  }

  // ── Shared sub-components ───────────────────────────────────────────────────

  const matchBar = (
    <div style={{ background: "var(--bg2)", padding: "7px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {game.sets_per_match > 1 && (<><span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 500, letterSpacing: "0.06em" }}>SET {game.current_set}/{game.sets_per_match}</span><span style={{ color: "var(--muted2)" }}>·</span></>)}
        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 500, letterSpacing: "0.06em" }}>LEG {game.current_leg}/{game.legs_per_set}</span>
        <span style={{ color: "var(--muted2)" }}>·</span>
        <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 500, letterSpacing: "0.06em" }}>{game.ruleset.replace(/_/g, " ").toUpperCase()}</span>
      </div>
      <button onClick={() => navigate("/")} style={{ background: "none", color: "var(--danger)", fontSize: "12px", fontWeight: 600 }}>Quit</button>
    </div>
  );

  // Score entry panel (numpad, multipliers, bull, bust/done)
  const inputPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {/* Multipliers */}
      <div style={{ display: "flex", gap: "4px" }}>
        {MULTIPLIERS.map(m => (
          <button key={m.value} className={`btn-multiplier ${multiplier === m.value ? "active" : ""}`}
            style={{ flex: 1, padding: "10px 4px" }} onClick={() => setMultiplier(m.value)}>{m.short}
          </button>
        ))}
      </div>
      {/* Numpad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "4px" }}>
        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => (
          <button key={n} className="btn-numpad"
            onClick={() => addDart(n, multiplier)}
            disabled={darts.length >= 3 || n * multiplier > remaining}>{n}
          </button>
        ))}
      </div>
      {/* Bull + Miss */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
        <button className="btn-bull25" onClick={() => addDart(25, 1, true)} disabled={darts.length >= 3 || 25 > remaining}>Bull 25</button>
        <button className="btn-bull50" onClick={() => addDart(50, 1, true)} disabled={darts.length >= 3 || 50 > remaining}>Bull 50</button>
        <button className="btn-special" onClick={() => addDart(0, 1)} disabled={darts.length >= 3}>Miss</button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "12px", textAlign: "center" }}>{error}</p>}
      {/* Bust / Done */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "6px" }}>
        <button className="btn-bust" onClick={handleBust}>BUST</button>
        <button className={`btn-submit ${darts.length > 0 ? "ready" : "waiting"}`}
          onClick={submitTurn} disabled={darts.length === 0 || submitting}>
          {submitting ? "..." : darts.length === 3 ? "NEXT →" : `DONE (${darts.length}/3)`}
        </button>
      </div>
    </div>
  );

  // Scoreboard — all players with current scores
  const scoreboard = (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {game.mode === "singles" && game.players.map((p, i) => {
        const active = i === currentPlayerIdx;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "var(--radius-xs)", background: active ? "var(--accent-tint)" : "transparent", border: `1px solid ${active ? "var(--accent-glow)" : "transparent"}` }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: p.avatar_color || "var(--muted2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {p.name[0].toUpperCase()}
            </div>
            <span style={{ fontSize: "13px", color: active ? "var(--text)" : "var(--muted)", flex: 1, fontWeight: active ? 600 : 400 }}>
              {p.name}{active ? " ▶" : ""}
            </span>
            <span style={{ fontFamily: "Barlow Condensed", fontSize: "36px", fontWeight: 800, color: active ? "var(--accent)" : "var(--muted2)", letterSpacing: "-1px", lineHeight: 1 }}>
              {active ? remaining : p.score}
            </span>
          </div>
        );
      })}
      {game.mode === "teams" && game.teams.map((t, ti) => {
        const active = ti === currentTeamIdx;
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "var(--radius-xs)", background: active ? "var(--accent-tint)" : "transparent", border: `1px solid ${active ? "var(--accent-glow)" : "transparent"}` }}>
            <span style={{ fontSize: "13px", color: active ? "var(--text)" : "var(--muted)", flex: 1, fontWeight: active ? 600 : 400 }}>
              {t.name}{active ? " ▶" : ""}
            </span>
            <span style={{ fontFamily: "Barlow Condensed", fontSize: "36px", fontWeight: 800, color: active ? "var(--accent)" : "var(--muted2)", letterSpacing: "-1px", lineHeight: 1 }}>
              {active ? remaining : t.score}
            </span>
          </div>
        );
      })}
    </div>
  );

  // Dart slots row
  const dartSlots = (
    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} className={`dart-slot ${darts[i] ? "filled" : "empty"}`} style={{ flex: 1 }}>
          <div className="dart-slot-label">D{i + 1}</div>
          <div className={`dart-slot-value ${darts[i] ? (darts[i].multiplier === 2 ? "double" : darts[i].multiplier === 3 ? "triple" : darts[i].isBull ? "bull" : "single") : "empty"}`}>
            {darts[i] ? darts[i].display : "—"}
          </div>
        </div>
      ))}
      <button onClick={undoDart} disabled={darts.length === 0}
        style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-xs)", padding: "8px 12px", color: "var(--muted)", fontSize: "13px", flexShrink: 0 }}>↩
      </button>
    </div>
  );

  // ── Layout rendering ────────────────────────────────────────────────────────
  // Priority: iPad landscape / tablet landscape → phone → desktop
  // CSS classes handle which layout shows at each breakpoint

  return (
    <>
      {/* ── PHONE PORTRAIT: vertical stack ─────────────── */}
      <div className="game-phone-only" style={{ maxWidth: "480px", margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {matchBar}
        {/* Active player */}
        <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: player?.avatar_color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(player?.name || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>{team ? `${team.name} · ` : ""}{player?.name}</div>
            <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "0.06em" }}>DART {darts.length + 1} OF 3</div>
          </div>
          {checkout && darts.length === 0 && (
            <div className="checkout-pill">
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)" }} />
              <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 600 }}>{checkout.join("→")}</span>
            </div>
          )}
        </div>
        {/* Big score */}
        <div style={{ textAlign: "center", padding: "0 16px 4px", flexShrink: 0 }}>
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "112px", fontWeight: 800, color: "var(--accent)", lineHeight: 0.85, letterSpacing: "-4px" }}>{remaining}</div>
          <div className="label-xs" style={{ marginTop: "3px" }}>remaining</div>
        </div>
        {/* Other players */}
        <div style={{ padding: "0 16px 6px", flexShrink: 0 }}>
          {game.mode === "singles" && game.players.filter((_, i) => i !== currentPlayerIdx).map(p => (
            <div key={p.id} style={{ background: "var(--bg2)", borderRadius: "var(--radius-xs)", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: p.avatar_color || "var(--muted2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "#fff" }}>{p.name[0].toUpperCase()}</div>
              <span style={{ fontSize: "11px", color: "var(--muted)", flex: 1 }}>{p.name}</span>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "26px", fontWeight: 700, color: "var(--muted2)", letterSpacing: "-1px", lineHeight: 1 }}>{p.score}</span>
            </div>
          ))}
          {game.mode === "teams" && game.teams.filter((_, i) => i !== currentTeamIdx).map(t => (
            <div key={t.id} style={{ background: "var(--bg2)", borderRadius: "var(--radius-xs)", padding: "6px 12px", display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)", flex: 1 }}>{t.name}</span>
              <span style={{ fontFamily: "Barlow Condensed", fontSize: "26px", fontWeight: 700, color: "var(--muted2)", letterSpacing: "-1px", lineHeight: 1 }}>{t.score}</span>
            </div>
          ))}
        </div>
        {/* Dart slots */}
        <div style={{ padding: "0 16px 5px", flexShrink: 0 }}>{dartSlots}</div>
        {/* Input */}
        <div style={{ padding: "4px 16px 12px" }}>{inputPanel}</div>
      </div>

      {/* ── TABLET/IPAD LANDSCAPE: 2-column, fits viewport ─ */}
      <div className="game-landscape-only" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {matchBar}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: score info */}
          <div style={{ width: "45%", display: "flex", flexDirection: "column", padding: "16px 20px", borderRight: "1px solid var(--border)", overflow: "hidden" }}>
            {/* Active player + big score */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: player?.avatar_color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {(player?.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{team ? `${team.name} · ` : ""}{player?.name}</div>
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "0.06em" }}>DART {darts.length + 1} OF 3</div>
              </div>
              {checkout && darts.length === 0 && (
                <div className="checkout-pill">
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)" }} />
                  <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 600 }}>{checkout.join(" → ")}</span>
                </div>
              )}
            </div>
            {/* Giant score */}
            <div style={{ fontFamily: "Barlow Condensed", fontSize: "140px", fontWeight: 800, color: "var(--accent)", lineHeight: 0.85, letterSpacing: "-5px", marginBottom: "8px" }}>{remaining}</div>
            <div className="label-xs" style={{ marginBottom: "14px" }}>remaining</div>
            {/* All players */}
            <div style={{ flex: 1, overflow: "hidden" }}>{scoreboard}</div>
            {/* Dart slots */}
            <div style={{ marginTop: "12px" }}>{dartSlots}</div>
          </div>
          {/* Right: input */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", overflow: "hidden" }}>
            <div className="label-xs" style={{ marginBottom: "10px" }}>Score entry</div>
            {inputPanel}
          </div>
        </div>
      </div>

      {/* ── DESKTOP: 3-column ───────────────────────────── */}
      <div className="game-desktop-col" style={{ background: "var(--bg)" }}>
        {/* Left: scoreboard */}
        <div className="game-col-left">
          {matchBar}
          <div style={{ padding: "16px 0" }}>{scoreboard}</div>
          <div style={{ marginTop: "auto" }}>{dartSlots}</div>
        </div>
        {/* Center: giant score */}
        <div className="game-col-center">
          <div style={{ fontFamily: "Barlow Condensed", fontSize: "200px", fontWeight: 800, color: "var(--accent)", lineHeight: 0.85, letterSpacing: "-8px", textAlign: "center" }}>{remaining}</div>
          <div className="label-xs" style={{ marginTop: "12px" }}>remaining · {team ? `${team.name} · ` : ""}{player?.name}</div>
          {checkout && darts.length === 0 && (
            <div className="checkout-pill" style={{ marginTop: "16px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)" }} />
              <span style={{ fontSize: "13px", color: "var(--green)", fontWeight: 600 }}>{checkout.join(" → ")}</span>
            </div>
          )}
          <div style={{ marginTop: "24px" }}>{dartSlots}</div>
        </div>
        {/* Right: input */}
        <div className="game-col-right">
          <div className="label-xs" style={{ marginBottom: "12px" }}>Score entry</div>
          {inputPanel}
        </div>
      </div>
    </>
  );
}
