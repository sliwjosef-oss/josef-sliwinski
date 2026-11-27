import { useMemo } from 'react';
import { listAchievementProgress } from '../utils/achievements';

export default function AchievementsScreen({
  onBack,
  discoveredCount = 0,
  totalSkins = 0,
  sidekicks = [],
}) {
  const rows = useMemo(
    () => listAchievementProgress({ discoveredCount, totalSkins, sidekicks }),
    [discoveredCount, totalSkins, sidekicks],
  );
  const unlockedCount = rows.filter((row) => row.unlocked).length;
  const groups = [];
  for (const row of rows) {
    const group = groups.find((entry) => entry.name === row.group);
    if (group) group.rows.push(row);
    else groups.push({ name: row.group, rows: [row] });
  }

  return (
    <div className="achievements-screen">
      <header className="catalogue-header">
        <h1>Achievements</h1>
        <p className="subtitle">
          Achievements collected: {unlockedCount} / {rows.length}
        </p>
        <button type="button" className="secondary-button catalogue-back-button" onClick={onBack}>
          Back to Hangman
        </button>
      </header>
      <div className="catalogue-scroll" tabIndex={0} aria-label="Achievements">
        {groups.map((group) => (
          <section key={group.name} className="achievement-group">
            <h2>{group.name}</h2>
            <ul className="achievement-list">
              {group.rows.map((row) => {
                const target = row.target || 0;
                const current = row.unlocked ? target || row.current : row.current;
                const width = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                const sidekick = row.reward.type === 'sidekick'
                  ? sidekicks.find((entry) => entry.name.trim().toLowerCase() === row.reward.name.trim().toLowerCase())
                  : null;
                return (
                  <li key={row.id} className={`achievement-card${row.unlocked ? ' is-unlocked' : ''}`}>
                    <div className="achievement-card-main">
                      <p className="achievement-name">{row.name}</p>
                      <p className="achievement-reward">{row.unlocked ? row.rewardText : '???'}</p>
                      {row.showBar ? (
                        <div className="achievement-progress">
                          <div className="achievement-progress-track" aria-hidden="true">
                            <span style={{ width: `${width}%` }} />
                          </div>
                          <p className="achievement-progress-label">
                            {Math.min(current, target)} / {target}
                          </p>
                        </div>
                      ) : (
                        <p className="achievement-progress-label">{row.unlocked ? 'Unlocked' : 'Locked'}</p>
                      )}
                    </div>
                    {sidekick?.icon ? (
                      <img
                        className={`achievement-sidekick${row.unlocked ? '' : ' sidekick-silhouette'}`}
                        src={sidekick.icon}
                        alt=""
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
