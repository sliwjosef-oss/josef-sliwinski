export function getOutfitIconSrc(outfit) {
  return outfit.icon || `/skin-icons/${outfit.number}.png`;
}
