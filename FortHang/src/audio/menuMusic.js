const TRACK_STORAGE_KEY = 'fort-hang-menu-track';
const MUTE_STORAGE_KEY = 'fort-hang-menu-muted';

export const MENU_TRACKS = [
  {
    id: 'concrete-pressure',
    label: 'Concrete Pressure',
    file: 'Concrete_Pressure.mp3',
  },
  {
    id: 'break-the-perimeter',
    label: 'Break the Perimeter',
    file: 'Break_the_Perimeter.mp3',
  },
  {
    id: 'between-the-rows',
    label: 'Between The Rows',
    file: 'Between_The_Rows.mp3',
  },
  {
    id: 'under-broken-skin',
    label: 'Under Broken Skin',
    file: 'Under_Broken_Skin.mp3',
  },
  {
    id: 'candy-in-a-plastic-wrap',
    label: 'Candy in a Plastic Wrap',
    file: 'Candy_in_a_Plastic_Wrap.mp3',
  },
  {
    id: 'beneath-the-spires',
    label: 'Beneath the Spires',
    file: 'Beneath_the_Spires.mp3',
  },
  {
    id: 'heart-like-a-piston',
    label: 'Heart Like A Piston',
    file: 'Heart_Like_A_Piston.mp3',
  },
  {
    id: 'perfect-despair',
    label: 'Perfect Despair',
    file: 'perfect_despair.mp3',
  },
];

let audio = null;
const blocks = new Set();
const listeners = new Set();
let wantsPlayback = false;
let retries = 0;
const MAX_RETRIES = 8;

function readStoredTrackId() {
  try {
    const stored = localStorage.getItem(TRACK_STORAGE_KEY);
    if (MENU_TRACKS.some((track) => track.id === stored)) return stored;
  } catch {
    /* ignore private-mode storage failures */
  }
  return MENU_TRACKS[0].id;
}

function readStoredMuted() {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let trackId = readStoredTrackId();
let muted = readStoredMuted();
const ownedMusicIds = new Set();
let previewAudio = null;
let previewTimer = null;
let previewTrackId = null;

const FREE_TRACK_IDS = [
  'concrete-pressure',
  'break-the-perimeter',
  'candy-in-a-plastic-wrap',
  'beneath-the-spires',
  'heart-like-a-piston',
];
const PREVIEW_SECONDS = 30;

function canPlayTrack(id) {
  return FREE_TRACK_IDS.includes(id) || ownedMusicIds.has(id);
}

export function getSelectableTracks() {
  return MENU_TRACKS.filter((track) => canPlayTrack(track.id));
}

export function getPreviewTrackId() {
  return previewTrackId;
}

/** Keep lobby playback aligned with songs the player has unlocked. */
export function setOwnedMusicIds(ids) {
  ownedMusicIds.clear();
  for (const id of ids || []) {
    if (typeof id === 'string') ownedMusicIds.add(id);
  }
  if (canPlayTrack(trackId)) return;
  trackId = FREE_TRACK_IDS[0];
  try {
    localStorage.setItem(TRACK_STORAGE_KEY, trackId);
  } catch {
    /* ignore */
  }
  if (audio) {
    audio.pause();
    audio.src = trackUrl(trackId);
    audio.currentTime = 0;
  }
}

function trackUrl(id) {
  const track = MENU_TRACKS.find((entry) => entry.id === id) || MENU_TRACKS[0];
  return `${import.meta.env.BASE_URL}audio/${track.file}`;
}

function notify() {
  for (const listener of listeners) listener();
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio(trackUrl(trackId));
    audio.loop = true;
    audio.volume = 0.55;
  }
  return audio;
}

function stopMenuAudio() {
  wantsPlayback = false;
  audio?.pause();
}

export function getMenuTrackId() {
  return trackId;
}

export function isMenuMuted() {
  return muted;
}

export function subscribeMenuMusic(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setMenuTrack(id) {
  if (!canPlayTrack(id) || id === trackId) return;
  trackId = id;
  try {
    localStorage.setItem(TRACK_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  if (audio) {
    audio.pause();
    audio.src = trackUrl(trackId);
    audio.currentTime = 0;
  }
  notify();
  if (!muted && blocks.size === 0) playMenuMusic();
}

export function setMenuMuted(next) {
  muted = Boolean(next);
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  notify();
  if (muted) {
    stopMenuAudio();
    return;
  }
  if (blocks.size === 0) playMenuMusic();
}

export function playMenuMusic() {
  if (blocks.size > 0 || muted) {
    stopMenuAudio();
    return;
  }
  wantsPlayback = true;
  const track = ensureAudio();
  const pending = track.play();
  if (!pending?.then) return;
  pending
    .then(() => {
      if (!wantsPlayback || blocks.size > 0 || muted) {
        track.pause();
        return;
      }
      retries = 0;
    })
    .catch(() => {
      if (!wantsPlayback || blocks.size > 0 || muted || retries >= MAX_RETRIES) return;
      retries += 1;
      window.setTimeout(() => {
        if (wantsPlayback && blocks.size === 0 && !muted && audio?.paused) playMenuMusic();
      }, 400);
    });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantsPlayback && blocks.size === 0 && !muted) {
    playMenuMusic();
  }
});

/** Pause menu music while another track owns the screen. Same reason twice does not stack. */
export function setMenuMusicBlocked(reason, blocked) {
  if (blocked) blocks.add(reason);
  else blocks.delete(reason);
  if (blocks.size > 0) {
    stopMenuAudio();
    return;
  }
  queueMicrotask(() => {
    if (blocks.size === 0) playMenuMusic();
  });
}

function haltPreviewAudio() {
  if (previewTimer) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
  previewTrackId = null;
  if (previewAudio) {
    previewAudio.onended = null;
    previewAudio.ontimeupdate = null;
    previewAudio.pause();
    previewAudio.currentTime = 0;
  }
}

export function stopMusicPreview() {
  const wasPlaying = previewTrackId != null;
  haltPreviewAudio();
  if (wasPlaying) setMenuMusicBlocked('preview', false);
  notify();
}

/** Play a shop song for 30 seconds without unlocking it. Starts over if tapped again. */
export function startMusicPreview(id) {
  const track = MENU_TRACKS.find((entry) => entry.id === id);
  if (!track) return;
  if (previewTrackId === id) {
    stopMusicPreview();
    return;
  }
  haltPreviewAudio();
  if (!previewAudio) {
    previewAudio = new Audio();
    previewAudio.loop = false;
    previewAudio.volume = 0.55;
  }
  previewTrackId = id;
  previewAudio.src = trackUrl(id);
  previewAudio.currentTime = 0;
  previewAudio.ontimeupdate = () => {
    if (previewAudio && previewAudio.currentTime >= PREVIEW_SECONDS) stopMusicPreview();
  };
  previewAudio.onended = () => stopMusicPreview();
  setMenuMusicBlocked('preview', true);
  const pending = previewAudio.play();
  if (pending?.catch) pending.catch(() => {});
  previewTimer = window.setTimeout(() => stopMusicPreview(), PREVIEW_SECONDS * 1000);
  notify();
}
