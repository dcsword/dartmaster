import TeamCard from './TeamCard';

export default function TeamsSetupSection({
  teams,
  setTeams,
  teamListRef,
  teamDragIdx,
  teamDragOver,
  onTeamDragStart,
  onTeamDragOver,
  onTeamDrop,
  onAddTeam,
}) {
  return (
    <div className="setup-section">
      <p className="label-xs setup-section-title">TEAMS (max 4)</p>
      <p className="setup-muted-copy setup-section-help">⠿ Drag teams or players to reorder · Team 1 throws first</p>

      <div ref={teamListRef} className="setup-stack-lg">
        {teams.map((team, teamIndex) => (
          <TeamCard
            key={teamIndex}
            team={team}
            teamIndex={teamIndex}
            totalTeams={teams.length}
            teamListRef={teamListRef}
            onTeamUpdate={updated => setTeams(prev => prev.map((currentTeam, currentIndex) => (
              currentIndex === teamIndex ? updated : currentTeam
            )))}
            onTeamRemove={() => setTeams(prev => prev.filter((_, currentIndex) => currentIndex !== teamIndex))}
            onTeamDragStart={onTeamDragStart}
            onTeamDragOver={onTeamDragOver}
            onTeamDrop={onTeamDrop}
            isTeamDragging={teamDragOver === teamIndex && teamDragIdx.current !== null && teamDragIdx.current !== teamIndex}
          />
        ))}
      </div>

      {teams.length < 4 && (
        <button className="btn-ghost setup-top-gap-md" onClick={onAddTeam}>
          + Add Team
        </button>
      )}
    </div>
  );
}
