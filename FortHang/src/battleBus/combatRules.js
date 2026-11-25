export const BOOGIE_ROUNDS = 2;
export const BOOGIE_BACKFIRE_CHANCE = 0.1;
export const CHUG_SPLASH_HP = 20;

/** One Bush blocks one sniper shot. Otherwise shield breaks, or the member is eliminated. */
export function applySniperShot(member, inventory) {
  const bushes = inventory?.Bush || 0;
  if (bushes > 0) {
    inventory.Bush = bushes - 1;
    if (inventory.Bush <= 0) delete inventory.Bush;
    return 'blocked';
  }
  if (member.shield > 0) {
    member.shield = 0;
    return 'shield';
  }
  member.hp = 0;
  return 'eliminated';
}

export function rollBoogieDancers(names, rand, chance = BOOGIE_BACKFIRE_CHANCE) {
  return names.filter(() => rand() < chance);
}

export function enemySkipsPanic(boogieRounds) {
  return boogieRounds > 0;
}
