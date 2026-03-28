import { PRESETS, RULESETS } from '../../constants/setupOptions';
import Stepper from './Stepper';

export default function MatchSettingsSection({
  ruleset,
  format,
  legsPerSet,
  setsPerMatch,
  activePreset,
  onRulesetChange,
  onPresetApply,
  onFormatChange,
  onLegsChange,
  onSetsChange,
  matchSummary,
}) {
  return (
    <>
      <div className="setup-section">
        <p className="label-xs setup-section-title">FINISH RULE</p>
        <div className="setup-chip-row">
          {RULESETS.map(rule => (
            <button
              key={rule.value}
              className={`tag ${ruleset === rule.value ? 'active' : ''}`}
              onClick={() => onRulesetChange(rule.value)}
            >
              {rule.label}
            </button>
          ))}
        </div>
        <p className="setup-muted-copy setup-top-gap-sm">
          {RULESETS.find(rule => rule.value === ruleset)?.desc}
        </p>
      </div>

      <div className="setup-section">
        <p className="label-xs setup-section-title">MATCH FORMAT</p>
        <div className="setup-chip-row setup-top-gap-sm">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              className={`tag ${activePreset === preset.label ? 'active' : ''}`}
              onClick={() => onPresetApply(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="card setup-format-card">
          <div className="setup-split-row">
            <div>
              <p className="setup-field-title">Format</p>
              <p className="setup-muted-copy">
                {format === 'best_of'
                  ? 'Win by majority (e.g. Bo3 = need 2)'
                  : 'Win exact count (e.g. First to 3)'}
              </p>
            </div>
            <div className="setup-chip-row">
              <button className={`tag ${format === 'best_of' ? 'active' : ''}`} onClick={() => onFormatChange('best_of')}>Best of</button>
              <button className={`tag ${format === 'first_to' ? 'active' : ''}`} onClick={() => onFormatChange('first_to')}>First to</button>
            </div>
          </div>

          <div className="setup-split-row">
            <div>
              <p className="setup-field-title">Legs per set</p>
              <p className="setup-muted-copy">Need {format === 'best_of' ? Math.ceil(legsPerSet / 2) : legsPerSet} to win a set</p>
            </div>
            <Stepper value={legsPerSet} min={1} max={11} onChange={onLegsChange} />
          </div>

          <div className="setup-split-row">
            <div>
              <p className="setup-field-title">Sets per match</p>
              <p className="setup-muted-copy">Need {format === 'best_of' ? Math.ceil(setsPerMatch / 2) : setsPerMatch} to win the match</p>
            </div>
            <Stepper value={setsPerMatch} min={1} max={11} onChange={onSetsChange} />
          </div>

          <div className="setup-summary-card">
            <p className="setup-summary-text">📋 {matchSummary()}</p>
          </div>
        </div>
      </div>
    </>
  );
}
