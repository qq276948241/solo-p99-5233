const COMBO_THRESHOLD = 3;

function getDamageMultiplier(comboCount, comboActive) {
  if (comboActive) return 2.0;
  if (comboCount === 2) return 1.3;
  if (comboCount === 1) return 1.1;
  return 1.0;
}

function incrementCombo(player) {
  player.comboCount++;
  if (player.comboCount >= COMBO_THRESHOLD) {
    player.comboActive = true;
  }
  if (player.comboCount > player.stats.maxCombo) {
    player.stats.maxCombo = player.comboCount;
  }
  return player.comboCount;
}

function breakCombo(player) {
  if (player.comboCount >= COMBO_THRESHOLD) {
    player.stats.comboBreaks++;
  }
  const oldCount = player.comboCount;
  const wasActive = player.comboActive;
  player.comboCount = 0;
  player.comboActive = false;
  return { oldCount, wasActive };
}

function resetCombo(player) {
  player.comboCount = 0;
  player.comboActive = false;
}

function calculatePlayerDamage(player, monster, speedBonus) {
  const comboMultiplier = getDamageMultiplier(player.comboCount, player.comboActive);
  const baseDamage = player.attack;
  return Math.max(1, Math.floor(baseDamage * speedBonus * comboMultiplier) - monster.defense);
}

function isPerfectBlock(timeRatio) {
  return timeRatio < 0.5;
}

function calculateSpeedBonus(timeRatio) {
  return Math.max(0.5, 2 - timeRatio * 1.5);
}

function calculateMonsterDamage(player, monster) {
  let damage = monster.attack;
  if (monster.isBoss && monster.attackBonus) {
    damage = Math.floor(damage * monster.attackBonus);
  }
  return damage;
}

function shouldComboBreak(inputResult, timeLimit) {
  if (!inputResult.success) return true;
  const timeRatio = inputResult.timeUsed / timeLimit;
  return !isPerfectBlock(timeRatio);
}

function getComboBreakComfort(breakResult) {
  const { oldCount, wasActive } = breakResult;
  if (wasActive) {
    return '连击中断了，不过这次攻击已经享受到加成啦！再来！';
  }
  if (oldCount > 0) {
    return '只差一点就完美了，连击重置了，下次加油！';
  }
  return null;
}

function getTimeoutComfort(breakResult) {
  const { wasActive, oldCount } = breakResult;
  if (wasActive) return '哎呀连击断了！别灰心，深呼吸，下一次一定可以的！';
  if (oldCount > 0) return '手速慢了一点点！没关系，重新来过！';
  return null;
}

function getTypoComfort(breakResult) {
  const { wasActive, oldCount } = breakResult;
  if (wasActive) return '连击没了好可惜！不过别管它，专注下一击吧！';
  if (oldCount > 0) return '一个小失误！稳下来，慢慢敲就好～';
  return '输错啦，下次看仔细一点哦！';
}

module.exports = {
  COMBO_THRESHOLD,
  getDamageMultiplier,
  incrementCombo,
  breakCombo,
  resetCombo,
  calculatePlayerDamage,
  calculateMonsterDamage,
  isPerfectBlock,
  calculateSpeedBonus,
  shouldComboBreak,
  getComboBreakComfort,
  getTimeoutComfort,
  getTypoComfort
};
