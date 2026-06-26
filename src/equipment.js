const equipmentTemplates = {
  weapon: [
    { id: 'w1', name: '生锈短剑', slot: 'weapon', rarity: 'common', attack: 5, minFloor: 1, emoji: '🗡️' },
    { id: 'w2', name: '铁剑', slot: 'weapon', rarity: 'common', attack: 10, minFloor: 2, emoji: '⚔️' },
    { id: 'w3', name: '精钢长剑', slot: 'weapon', rarity: 'uncommon', attack: 18, minFloor: 4, emoji: '🔪' },
    { id: 'w4', name: '火焰之刃', slot: 'weapon', rarity: 'rare', attack: 28, minFloor: 6, emoji: '🔥' },
    { id: 'w5', name: '雷霆之锤', slot: 'weapon', rarity: 'rare', attack: 35, minFloor: 8, emoji: '⚡' },
    { id: 'w6', name: '噬魂匕首', slot: 'weapon', rarity: 'epic', attack: 45, minFloor: 10, emoji: '🩸' },
    { id: 'w7', name: '龙牙巨剑', slot: 'weapon', rarity: 'epic', attack: 60, minFloor: 15, emoji: '🐲' },
    { id: 'w8', name: '虚空之刃', slot: 'weapon', rarity: 'legendary', attack: 80, minFloor: 20, emoji: '🌑' }
  ],
  armor: [
    { id: 'a1', name: '破布衣', slot: 'armor', rarity: 'common', defense: 2, maxHp: 10, minFloor: 1, emoji: '👕' },
    { id: 'a2', name: '皮甲', slot: 'armor', rarity: 'common', defense: 5, maxHp: 20, minFloor: 2, emoji: '🦺' },
    { id: 'a3', name: '锁子甲', slot: 'armor', rarity: 'uncommon', defense: 10, maxHp: 35, minFloor: 4, emoji: '⛓️' },
    { id: 'a4', name: '板甲', slot: 'armor', rarity: 'rare', defense: 18, maxHp: 50, minFloor: 6, emoji: '🛡️' },
    { id: 'a5', name: '魔法长袍', slot: 'armor', rarity: 'rare', defense: 12, maxHp: 80, minFloor: 8, emoji: '🧥' },
    { id: 'a6', name: '龙鳞甲', slot: 'armor', rarity: 'epic', defense: 28, maxHp: 100, minFloor: 12, emoji: '🐉' },
    { id: 'a7', name: '暗影斗篷', slot: 'armor', rarity: 'epic', defense: 22, maxHp: 150, minFloor: 16, emoji: '🌑' },
    { id: 'a8', name: '神圣铠甲', slot: 'armor', rarity: 'legendary', defense: 40, maxHp: 200, minFloor: 20, emoji: '✨' }
  ],
  accessory: [
    { id: 'c1', name: '铜戒指', slot: 'accessory', rarity: 'common', attack: 2, defense: 1, minFloor: 1, emoji: '💍' },
    { id: 'c2', name: '银护符', slot: 'accessory', rarity: 'common', attack: 3, defense: 3, maxHp: 15, minFloor: 2, emoji: '📿' },
    { id: 'c3', name: '力量手镯', slot: 'accessory', rarity: 'uncommon', attack: 8, maxHp: 25, minFloor: 4, emoji: '💪' },
    { id: 'c4', name: '守护项链', slot: 'accessory', rarity: 'rare', defense: 10, maxHp: 40, minFloor: 6, emoji: '🔮' },
    { id: 'c5', name: '疾风之靴', slot: 'accessory', rarity: 'rare', attack: 10, defense: 5, minFloor: 8, emoji: '👟' },
    { id: 'c6', name: '吸血戒指', slot: 'accessory', rarity: 'epic', attack: 15, lifesteal: 0.1, minFloor: 10, emoji: '🩸' },
    { id: 'c7', name: '龙心吊坠', slot: 'accessory', rarity: 'epic', attack: 12, defense: 12, maxHp: 80, minFloor: 15, emoji: '❤️' },
    { id: 'c8', name: '神器·永恒', slot: 'accessory', rarity: 'legendary', attack: 25, defense: 25, maxHp: 150, minFloor: 20, emoji: '💎' }
  ]
};

const rarityConfig = {
  common: { color: 'white', dropRate: 0.5, name: '普通' },
  uncommon: { color: 'green', dropRate: 0.3, name: '优秀' },
  rare: { color: 'blue', dropRate: 0.15, name: '稀有' },
  epic: { color: 'magenta', dropRate: 0.04, name: '史诗' },
  legendary: { color: 'yellow', dropRate: 0.01, name: '传说' }
};

function getRarityColor(rarity) {
  return rarityConfig[rarity]?.color || 'white';
}

function getRarityName(rarity) {
  return rarityConfig[rarity]?.name || '普通';
}

function getAvailableEquipment(floor) {
  const all = [];
  Object.values(equipmentTemplates).forEach(slot => {
    slot.forEach(item => {
      if (item.minFloor <= floor) {
        all.push(item);
      }
    });
  });
  return all;
}

function rollRarity(floor) {
  const luckBonus = Math.min(0.2, floor * 0.01);
  const roll = Math.random();
  let cumulative = 0;
  
  const rarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  for (const rarity of rarities) {
    cumulative += rarityConfig[rarity].dropRate + luckBonus / 5;
    if (roll < cumulative) {
      return rarity;
    }
  }
  return 'common';
}

function generateEquipment(floor, forceSlot = null) {
  let slot;
  if (forceSlot) {
    slot = forceSlot;
  } else {
    const slots = ['weapon', 'armor', 'accessory'];
    slot = slots[Math.floor(Math.random() * slots.length)];
  }
  
  const rarity = rollRarity(floor);
  const candidates = equipmentTemplates[slot].filter(
    e => e.minFloor <= floor && e.rarity === rarity
  );
  
  if (candidates.length === 0) {
    const fallback = equipmentTemplates[slot].filter(e => e.minFloor <= floor);
    if (fallback.length === 0) return null;
    return { ...fallback[Math.floor(Math.random() * fallback.length)] };
  }
  
  return { ...candidates[Math.floor(Math.random() * candidates.length)] };
}

function generateBossDrop(floor) {
  const items = [];
  const itemCount = 2 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < itemCount; i++) {
    const item = generateEquipment(floor);
    if (item) {
      const rarities = ['rare', 'epic', 'legendary'];
      item.rarity = rarities[Math.min(2, Math.floor(Math.random() * 3))];
      items.push(item);
    }
  }
  
  return items;
}

function calculateEquipmentStats(equipment) {
  const stats = {
    attack: 0,
    defense: 0,
    maxHp: 0,
    lifesteal: 0
  };
  
  if (equipment.weapon) {
    stats.attack += equipment.weapon.attack || 0;
    stats.defense += equipment.weapon.defense || 0;
    stats.maxHp += equipment.weapon.maxHp || 0;
    stats.lifesteal += equipment.weapon.lifesteal || 0;
  }
  
  if (equipment.armor) {
    stats.attack += equipment.armor.attack || 0;
    stats.defense += equipment.armor.defense || 0;
    stats.maxHp += equipment.armor.maxHp || 0;
    stats.lifesteal += equipment.armor.lifesteal || 0;
  }
  
  if (equipment.accessory) {
    stats.attack += equipment.accessory.attack || 0;
    stats.defense += equipment.accessory.defense || 0;
    stats.maxHp += equipment.accessory.maxHp || 0;
    stats.lifesteal += equipment.accessory.lifesteal || 0;
  }
  
  return stats;
}

function compareEquipment(newItem, currentItem) {
  if (!currentItem) return { better: true, reason: '空槽位' };
  
  const newStats = {
    attack: newItem.attack || 0,
    defense: newItem.defense || 0,
    maxHp: newItem.maxHp || 0,
    lifesteal: newItem.lifesteal || 0
  };
  
  const oldStats = {
    attack: currentItem.attack || 0,
    defense: currentItem.defense || 0,
    maxHp: currentItem.maxHp || 0,
    lifesteal: currentItem.lifesteal || 0
  };
  
  const newTotal = newStats.attack + newStats.defense + newStats.maxHp / 5 + newStats.lifesteal * 100;
  const oldTotal = oldStats.attack + oldStats.defense + oldStats.maxHp / 5 + oldStats.lifesteal * 100;
  
  const reasons = [];
  if (newStats.attack > oldStats.attack) reasons.push(`攻击 +${newStats.attack - oldStats.attack}`);
  if (newStats.defense > oldStats.defense) reasons.push(`防御 +${newStats.defense - oldStats.defense}`);
  if (newStats.maxHp > oldStats.maxHp) reasons.push(`生命 +${newStats.maxHp - oldStats.maxHp}`);
  if (newStats.lifesteal > oldStats.lifesteal) reasons.push(`吸血 +${((newStats.lifesteal - oldStats.lifesteal) * 100).toFixed(0)}%`);
  
  return {
    better: newTotal > oldTotal,
    reason: reasons.join(', ') || '属性相当'
  };
}

module.exports = {
  equipmentTemplates,
  rarityConfig,
  getRarityColor,
  getRarityName,
  generateEquipment,
  generateBossDrop,
  calculateEquipmentStats,
  compareEquipment,
  getAvailableEquipment
};
