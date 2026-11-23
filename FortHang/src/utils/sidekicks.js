import { resolveAssetPath } from './outfits';

export function getSidekickIconSrc(sidekick) {
  if (!sidekick) return null;
  if (sidekick.icon) {
    if (/^https?:\/\//i.test(sidekick.icon)) return sidekick.icon;
    return resolveAssetPath(sidekick.icon);
  }
  return null;
}

export function getSidekickSilhouetteSrc(sidekick) {
  // Same source as the color icon; CSS applies brightness(0) for silhouette.
  return getSidekickIconSrc(sidekick);
}
