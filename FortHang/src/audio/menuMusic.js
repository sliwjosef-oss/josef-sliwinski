import { unlockedMusicIds } from '../utils/achievementStore';

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
    id: 'season-ends-tonight',
    label: 'Season Ends Tonight',
    file: 'Season_Ends_Tonight.mp3',
  },
  {
    id: 'under-broken-skin',
    label: 'Under Broken Skin',
    file: 'Under_Broken_Skin.mp3',
  },
  {
    id: 'a-blade-of-frozen-fire',
    label: 'A Blade of Frozen Fire',
    file: 'A_Blade_of_Frozen_Fire.mp3',
  },
  {
    id: 'heartbeat-in-the-arcade',
    label: 'Heartbeat in the Arcade',
    file: 'Heartbeat_in_the_Arcade.mp3',
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
    id: 'winning-the-morning',
    label: 'Winning the Morning',
    file: 'Winning_the_Morning.mp3',
  },
  {
    id: 'king-of-aisle-four',
    label: 'King of Aisle Four',
    file: 'King_of_Aisle_Four.mp3',
  },
  {
    id: 'the-velvet-arc',
    label: 'The Velvet Arc',
    file: 'The_Velvet_Arc.mp3',
  },
  {
    id: 'gold-pump-loaded',
    label: 'Gold Pump Loaded',
    file: 'Gold_Pump_Loaded.mp3',
  },
  {
    id: 'queen-of-the-underground',
    label: 'Queen of the Underground',
    file: 'Queen_of_the_Underground.mp3',
  },
  {
    id: 'the-final-page',
    label: 'The Final Page',
    file: 'The_Final_Page.mp3',
  },
  {
    id: 'velocity-breach',
    label: 'Velocity Breach',
    file: 'Velocity_Breach.mp3',
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
    const id = stored === 'between-the-rows' ? 'season-ends-tonight' : stored;
    if (MENU_TRACKS.some((track) => track.id === id)) return id;
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
const PREVIEW_SECONDS = 30;
const PREVIEW_START_SECONDS = 20;
const PREVIEW_VOLUME = 0.55;
const PREVIEW_FADE_MS = 1600;

let previewAudio = null;
let previewTimer = null;
let previewTick = null;
let previewTrackId = null;
let previewFadeFrame = null;
let previewEndTime = PREVIEW_SECONDS;
let previewDeadline = 0;

const FREE_TRACK_IDS = ['concrete-pressure', 'break-the-perimeter'];

function canPlayTrack(id) {
  return FREE_TRACK_IDS.includes(id) || ownedMusicIds.has(id) || unlockedMusicIds().includes(id);
}

export function getSelectableTracks() {
  return MENU_TRACKS.filter((track) => canPlayTrack(track.id));
}

export function getPreviewTrackId() {
  return previewTrackId;
}

export function getPreviewSecondsLeft() {
  if (!previewTrackId) return 0;
  if (!previewDeadline) return PREVIEW_SECONDS;
  return Math.max(0, Math.ceil((previewDeadline - Date.now()) / 1000));
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

function isPageHidden() {
  return document.visibilityState === 'hidden';
}

const pageAudios = new Set();

/** Keep this audio quiet while FortHang is in a background tab, then resume it. */
export function bindPageAudio(element) {
  if (!element || element.__pageBound) return element;
  element.__pageBound = true;
  pageAudios.add(element);
  const play = element.play.bind(element);
  element.play = () => {
    if (isPageHidden()) {
      element.__resumeOnVisible = true;
      return Promise.resolve();
    }
    const pending = play();
    if (pending?.then) {
      return pending.then((value) => {
        if (isPageHidden()) {
          element.pause();
          element.__resumeOnVisible = true;
        }
        return value;
      });
    }
    return pending;
  };
  return element;
}

export function releasePageAudio(element) {
  if (!element) return;
  element.__resumeOnVisible = false;
  element.pause();
}

function ensureAudio() {
  if (!audio) {
    audio = bindPageAudio(new Audio(trackUrl(trackId)));
    audio.loop = true;
    audio.volume = 0.55;
  }
  return audio;
}

function stopMenuAudio() {
  wantsPlayback = false;
  releasePageAudio(audio);
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
  if (isPageHidden()) return;
  const track = ensureAudio();
  const pending = track.play();
  if (!pending?.then) return;
  pending
    .then(() => {
      if (!wantsPlayback || blocks.size > 0 || muted || isPageHidden()) {
        track.pause();
        if (isPageHidden() && wantsPlayback && blocks.size === 0 && !muted) {
          track.__resumeOnVisible = true;
        }
        return;
      }
      retries = 0;
    })
    .catch(() => {
      if (!wantsPlayback || blocks.size > 0 || muted || retries >= MAX_RETRIES) return;
      retries += 1;
      window.setTimeout(() => {
        if (wantsPlayback && blocks.size === 0 && !muted && !isPageHidden() && audio?.paused) playMenuMusic();
      }, 400);
    });
}

document.addEventListener('visibilitychange', () => {
  if (isPageHidden()) {
    for (const element of pageAudios) {
      if (!element.paused && !element.ended) {
        element.pause();
        element.__resumeOnVisible = true;
      }
    }
    return;
  }
  for (const element of pageAudios) {
    if (!element.__resumeOnVisible) continue;
    element.__resumeOnVisible = false;
    const pending = element.play();
    if (pending?.catch) pending.catch(() => {});
  }
  if (wantsPlayback && blocks.size === 0 && !muted) playMenuMusic();
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

function stopPreviewFade() {
  if (previewFadeFrame != null) {
    window.cancelAnimationFrame(previewFadeFrame);
    previewFadeFrame = null;
  }
}

function fadePreviewIn(element) {
  stopPreviewFade();
  element.volume = 0;
  const started = performance.now();
  const step = (now) => {
    if (previewAudio !== element) return;
    const progress = Math.min(1, (now - started) / PREVIEW_FADE_MS);
    element.volume = PREVIEW_VOLUME * progress;
    if (progress < 1) previewFadeFrame = window.requestAnimationFrame(step);
    else previewFadeFrame = null;
  };
  previewFadeFrame = window.requestAnimationFrame(step);
}

function cuePreviewStart(element) {
  const duration = element.duration;
  const start = Number.isFinite(duration) && duration > PREVIEW_START_SECONDS + 1
    ? PREVIEW_START_SECONDS
    : 0;
  previewEndTime = start + PREVIEW_SECONDS;
  try {
    element.currentTime = start;
  } catch {
    /* Some browsers reject a seek before the media is seekable. */
  }
}

function clearPreviewClock() {
  if (previewTimer) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (previewTick) {
    window.clearInterval(previewTick);
    previewTick = null;
  }
  previewDeadline = 0;
}

function startPreviewClock() {
  clearPreviewClock();
  previewDeadline = Date.now() + PREVIEW_SECONDS * 1000;
  previewTick = window.setInterval(() => {
    if (!previewTrackId) {
      clearPreviewClock();
      return;
    }
    notify();
  }, 250);
  previewTimer = window.setTimeout(() => stopMusicPreview(), PREVIEW_SECONDS * 1000);
  notify();
}

function haltPreviewAudio() {
  stopPreviewFade();
  clearPreviewClock();
  previewTrackId = null;
  if (previewAudio) {
    previewAudio.onended = null;
    previewAudio.ontimeupdate = null;
    previewAudio.onloadedmetadata = null;
    previewAudio.onseeked = null;
    releasePageAudio(previewAudio);
    previewAudio.volume = 0;
    previewAudio.currentTime = 0;
  }
}

export function stopMusicPreview() {
  const wasPlaying = previewTrackId != null;
  haltPreviewAudio();
  if (wasPlaying) setMenuMusicBlocked('preview', false);
  notify();
}

/** Play 30 seconds of a shop song, starting 20 seconds in, and fade the volume up. */
export function startMusicPreview(id) {
  const track = MENU_TRACKS.find((entry) => entry.id === id);
  if (!track) return;
  if (previewTrackId === id) {
    stopMusicPreview();
    return;
  }
  haltPreviewAudio();
  if (!previewAudio) {
    previewAudio = bindPageAudio(new Audio());
    previewAudio.loop = false;
  }
  previewTrackId = id;
  previewEndTime = PREVIEW_START_SECONDS + PREVIEW_SECONDS;
  previewAudio.volume = 0;
  previewAudio.src = trackUrl(id);
  let started = false;
  const begin = () => {
    if (started || previewTrackId !== id || !previewAudio) return;
    started = true;
    cuePreviewStart(previewAudio);
    const playFromCue = () => {
      if (previewTrackId !== id || !previewAudio) return;
      const pending = previewAudio.play();
      const startFade = () => {
        if (previewTrackId === id && previewAudio) fadePreviewIn(previewAudio);
      };
      if (pending?.then) pending.then(startFade).catch(() => {});
      else startFade();
      startPreviewClock();
    };
    const start = previewEndTime - PREVIEW_SECONDS;
    if (start > 0 && Math.abs(previewAudio.currentTime - start) > 0.4) {
      previewAudio.onseeked = () => {
        if (previewAudio) previewAudio.onseeked = null;
        playFromCue();
      };
      return;
    }
    playFromCue();
  };
  previewAudio.onloadedmetadata = begin;
  previewAudio.ontimeupdate = () => {
    if (previewAudio && previewAudio.currentTime >= previewEndTime) stopMusicPreview();
  };
  previewAudio.onended = () => stopMusicPreview();
  setMenuMusicBlocked('preview', true);
  if (previewAudio.readyState >= 1) begin();
  notify();
}
