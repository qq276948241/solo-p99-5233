const monsters = [
  {
    id: 'slime',
    name: '史莱姆',
    emoji: '🟢',
    baseHp: 20,
    baseAttack: 5,
    baseDefense: 0,
    minFloor: 1,
    maxFloor: 5,
    expReward: 10,
    goldReward: [5, 15],
    description: '软绵绵的低级怪物，新手练手用'
  },
  {
    id: 'goblin',
    name: '哥布林',
    emoji: '👺',
    baseHp: 30,
    baseAttack: 8,
    baseDefense: 2,
    minFloor: 1,
    maxFloor: 7,
    expReward: 15,
    goldReward: [10, 25],
    description: '狡猾的小绿皮，喜欢偷袭'
  },
  {
    id: 'skeleton',
    name: '骷髅兵',
    emoji: '💀',
    baseHp: 40,
    baseAttack: 12,
    baseDefense: 3,
    minFloor: 3,
    maxFloor: 8,
    expReward: 25,
    goldReward: [15, 35],
    description: '亡灵军团的士兵，不知疼痛'
  },
  {
    id: 'orc',
    name: '兽人战士',
    emoji: '👹',
    baseHp: 60,
    baseAttack: 18,
    baseDefense: 5,
    minFloor: 4,
    maxFloor: 9,
    expReward: 40,
    goldReward: [25, 50],
    description: '强壮的兽人，力大无穷'
  },
  {
    id: 'ghost',
    name: '幽灵',
    emoji: '👻',
    baseHp: 35,
    baseAttack: 22,
    baseDefense: 1,
    minFloor: 5,
    maxFloor: 9,
    expReward: 35,
    goldReward: [20, 45],
    description: '飘忽不定的灵体，攻击力很高'
  },
  {
    id: 'vampire',
    name: '吸血鬼',
    emoji: '🧛',
    baseHp: 55,
    baseAttack: 25,
    baseDefense: 6,
    minFloor: 6,
    maxFloor: 10,
    expReward: 55,
    goldReward: [40, 70],
    description: '嗜血的暗夜生物，能吸取生命'
  },
  {
    id: 'darkknight',
    name: '黑暗骑士',
    emoji: '🗡️',
    baseHp: 80,
    baseAttack: 30,
    baseDefense: 10,
    minFloor: 7,
    maxFloor: 10,
    expReward: 70,
    goldReward: [50, 90],
    description: '堕落的骑士，装备精良'
  },
  {
    id: 'demon',
    name: '恶魔',
    emoji: '😈',
    baseHp: 100,
    baseAttack: 35,
    baseDefense: 8,
    minFloor: 8,
    maxFloor: 10,
    expReward: 90,
    goldReward: [70, 120],
    description: '来自地狱的恶魔，危险至极'
  },
  {
    id: 'dragon',
    name: '幼龙',
    emoji: '🐉',
    baseHp: 120,
    baseAttack: 40,
    baseDefense: 12,
    minFloor: 9,
    maxFloor: 10,
    expReward: 120,
    goldReward: [100, 180],
    description: '年幼的龙，但依然非常强大'
  }
];

const bosses = [
  {
    id: 'boss_goblinking',
    name: '哥布林王',
    emoji: '👑👺',
    baseHp: 200,
    baseAttack: 25,
    baseDefense: 8,
    floor: 10,
    expReward: 200,
    goldReward: [200, 300],
    description: '哥布林部落的统治者，力大无穷且诡计多端',
    hasNoise: true,
    attackBonus: 1.2
  },
  {
    id: 'boss_lich',
    name: '巫妖王',
    emoji: '💀👑',
    baseHp: 350,
    baseAttack: 40,
    baseDefense: 12,
    floor: 20,
    expReward: 400,
    goldReward: [400, 600],
    description: '掌控死灵魔法的不死君主',
    hasNoise: true,
    attackBonus: 1.4
  },
  {
    id: 'boss_demonlord',
    name: '恶魔领主',
    emoji: '😈🔥',
    baseHp: 500,
    baseAttack: 55,
    baseDefense: 15,
    floor: 30,
    expReward: 700,
    goldReward: [700, 1000],
    description: '地狱深渊的统治者，拥有毁灭性的力量',
    hasNoise: true,
    attackBonus: 1.6
  },
  {
    id: 'boss_dragonelder',
    name: '远古巨龙',
    emoji: '🐉💎',
    baseHp: 800,
    baseAttack: 75,
    baseDefense: 20,
    floor: 40,
    expReward: 1200,
    goldReward: [1200, 1800],
    description: '活了千年的远古巨龙，地牢的终极守护者',
    hasNoise: true,
    attackBonus: 1.8
  },
  {
    id: 'boss_voidlord',
    name: '虚空之主',
    emoji: '🌑⚫',
    baseHp: 1200,
    baseAttack: 100,
    baseDefense: 25,
    floor: 50,
    expReward: 2000,
    goldReward: [2000, 3000],
    description: '来自虚空的恐怖存在，世界的毁灭者',
    hasNoise: true,
    attackBonus: 2.0
  }
];

function getAvailableMonsters(floor) {
  return monsters.filter(m => floor >= m.minFloor && floor <= m.maxFloor);
}

function spawnMonster(floor) {
  const available = getAvailableMonsters(floor);
  if (available.length === 0) return null;
  
  const template = available[Math.floor(Math.random() * available.length)];
  const floorMultiplier = 1 + (floor - 1) * 0.1;
  
  return {
    ...template,
    hp: Math.floor(template.baseHp * floorMultiplier),
    maxHp: Math.floor(template.baseHp * floorMultiplier),
    attack: Math.floor(template.baseAttack * floorMultiplier),
    defense: Math.floor(template.baseDefense * floorMultiplier),
    isBoss: false
  };
}

function getBossForFloor(floor) {
  const boss = bosses.find(b => b.floor === floor);
  if (!boss) return null;
  
  return {
    ...boss,
    hp: boss.baseHp,
    maxHp: boss.baseHp,
    attack: boss.baseAttack,
    defense: boss.baseDefense,
    isBoss: true
  };
}

function getAllBossFloors() {
  return bosses.map(b => b.floor).sort((a, b) => a - b);
}

module.exports = {
  monsters,
  bosses,
  spawnMonster,
  getBossForFloor,
  getAvailableMonsters,
  getAllBossFloors
};
