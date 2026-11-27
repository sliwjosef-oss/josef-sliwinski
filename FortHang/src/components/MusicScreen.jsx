import { useEffect, useState } from 'react';
import {
  MENU_TRACKS,
  getMenuTrackId,
  getSelectableTracks,
  isMenuMuted,
  setMenuMuted,
  setMenuTrack,
  subscribeMenuMusic,
} from '../audio/menuMusic';

export default function MusicScreen({ onBack }) {
  const [, setRevision] = useState(0);

  useEffect(() => subscribeMenuMusic(() => setRevision((current) => current + 1)), []);

  const unlockedIds = new Set(getSelectableTracks().map((track) => track.id));
  const trackId = getMenuTrackId();
  const muted = isMenuMuted();

  return (
    <div className="music-screen">
      <header className="catalogue-header">
        <h1>Music</h1>
        <p className="subtitle">
          {unlockedIds.size} of {MENU_TRACKS.length} tracks discovered
        </p>
        <p className="subtitle">
          Choose the song that plays in the lobby. More songs can be unlocked in the Shop.
        </p>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to Hangman
          </button>
          <button
            type="button"
            className={`secondary-button music-mute-button${muted ? ' is-muted' : ''}`}
            aria-pressed={muted}
            onClick={() => setMenuMuted(!muted)}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </header>

      <div className="catalogue-scroll" tabIndex={0} aria-label="Lobby songs">
        <ul className="music-song-list">
          {MENU_TRACKS.map((track) => {
            const unlocked = unlockedIds.has(track.id);
            const selected = unlocked && track.id === trackId;
            return (
              <li key={track.id}>
                <button
                  type="button"
                  className={`music-song${selected ? ' is-current' : ''}${unlocked ? '' : ' is-locked'}`}
                  aria-pressed={selected}
                  disabled={!unlocked}
                  onClick={() => setMenuTrack(track.id)}
                >
                  <span>{track.label}</span>
                  {selected ? (
                    <span className="music-song-state">{muted ? 'Muted' : 'Playing'}</span>
                  ) : unlocked ? null : (
                    <span className="music-song-state">Locked</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
