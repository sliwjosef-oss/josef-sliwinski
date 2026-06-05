export function resolveAssetPath(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const base = import.meta.env.BASE_URL;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}

export function getOutfitIconSrc(outfit) {
  if (outfit.icon) return resolveAssetPath(outfit.icon);
  return resolveAssetPath(`skin-icons/${outfit.number}.png`);
}
