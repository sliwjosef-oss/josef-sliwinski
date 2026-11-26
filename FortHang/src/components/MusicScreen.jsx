import { useEffect, useState } from 'react';
import {
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

  const tracks = getSelectableTracks();
  const trackId = getMenuTrackId();
  const muted = isMenuMuted();

  return (
    <div className="music-screen">
      <header className="catalogue-header">
        <h1>Music</h1>
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

      <ul className="music-song-list" aria-label="Lobby songs">
        {tracks.map((track) => {
          const selected = track.id === trackId;
          return (
            <li key={track.id}>
              <button
                type="button"
                className={`music-song${selected ? ' is-current' : ''}`}
                aria-pressed={selected}
                onClick={() => setMenuTrack(track.id)}
              >
                <span>{track.label}</span>
                {selected ? <span className="music-song-state">{muted ? 'Muted' : 'Playing'}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
