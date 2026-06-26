const { calculateEquipmentStats } = require('./equipment');

class Player {
  constructor(name = '冒险者') {
    this.name = name;
    this.level = 1;
    this.exp = 0;
    this.expToNext = 100;
    
    this.baseHp = 100;
    this.baseAttack = 10;
    this.baseDefense = 5;
    
    this.hp = 100;
    this.maxHp = 100;
    this.attack = 10;
    this.defense = 5;
    this.gold = 0;
    
    this.floor = 1;
    this.highestFloor = 1;
    
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };
    
    this.buffs = [];
    this.debuffs = [];
    
    this.stats = {
      monstersKilled: 0,
      bossesKilled: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      perfectBlocks: 0,
      itemsCollected: 0,
      maxCombo: 0,
      comboBreaks: 0
    };
    
    this.comboCount = 0;
    this.comboActive = false;
    
    this.recalculateStats();
  }
  
  recalculateStats() {
    const equipStats = calculateEquipmentStats(this.equipment);
    
    let attackBonus = 0;
    let defenseBonus = 0;
    let maxHpBonus = 0;
    
    for (const buff of this.buffs) {
      if (buff.stat === 'attack') attackBonus += buff.value;
      if (buff.stat === 'defense') defenseBonus += buff.value;
      if (buff.stat === 'maxHp') maxHpBonus += buff.value;
    }
    
    for (const debuff of this.debuffs) {
      if (debuff.stat === 'attack') attackBonus -= debuff.value;
      if (debuff.stat === 'defense') defenseBonus -= debuff.value;
    }
    
    const oldMaxHp = this.maxHp;
    this.attack = this.baseAttack + equipStats.attack + attackBonus + (this.level - 1) * 2;
    this.defense = this.baseDefense + equipStats.defense + defenseBonus + (this.level - 1) * 1;
    this.maxHp = this.baseHp + equipStats.maxHp + maxHpBonus + (this.level - 1) * 10;
    
    if (this.maxHp > oldMaxHp) {
      this.hp += this.maxHp - oldMaxHp;
    }
    this.hp = Math.min(this.hp, this.maxHp);
  }
  
  gainExp(amount) {
    this.exp += amount;
    let leveledUp = false;
    
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.level++;
      this.expToNext = Math.floor(this.expToNext * 1.5);
      leveledUp = true;
      
      this.baseHp += 15;
      this.baseAttack += 3;
      this.baseDefense += 2;
      
      this.hp = this.maxHp;
    }
    
    if (leveledUp) {
      this.recalculateStats();
    }
    
    return leveledUp;
  }
  
  takeDamage(amount) {
    const actualDamage = Math.max(1, amount - this.defense);
    this.hp -= actualDamage;
    this.stats.totalDamageTaken += actualDamage;
    return actualDamage;
  }
  
  dealDamage(amount) {
    this.stats.totalDamageDealt += amount;
    return amount;
  }
  
  heal(amount) {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - oldHp;
  }
  
  isAlive() {
    return this.hp > 0;
  }
  
  equipItem(item) {
    const slot = item.slot;
    const oldItem = this.equipment[slot];
    this.equipment[slot] = item;
    this.stats.itemsCollected++;
    this.recalculateStats();
    return oldItem;
  }
  
  addBuff(buff) {
    const existing = this.buffs.find(b => b.stat === buff.stat && b.duration > 0);
    if (existing) {
      existing.value = Math.max(existing.value, buff.value);
      existing.duration = Math.max(existing.duration, buff.duration);
    } else {
      this.buffs.push({ ...buff });
    }
    this.recalculateStats();
  }
  
  addDebuff(debuff) {
    this.debuffs.push({ ...debuff });
    this.recalculateStats();
  }
  
  updateBuffs() {
    this.buffs = this.buffs.filter(buff => {
      if (buff.duration === 0) return true;
      buff.duration--;
      return buff.duration > 0;
    });
    
    this.debuffs = this.debuffs.filter(debuff => {
      if (debuff.duration === 0) return true;
      debuff.duration--;
      return debuff.duration > 0;
    });
    
    this.recalculateStats();
  }
  
  getLifesteal() {
    return this.equipment.accessory?.lifesteal || 0;
  }
  
  advanceFloor() {
    this.floor++;
    if (this.floor > this.highestFloor) {
      this.highestFloor = this.floor;
    }
    this.updateBuffs();
  }
  
  toJSON() {
    return {
      name: this.name,
      level: this.level,
      exp: this.exp,
      expToNext: this.expToNext,
      baseHp: this.baseHp,
      baseAttack: this.baseAttack,
      baseDefense: this.baseDefense,
      hp: this.hp,
      maxHp: this.maxHp,
      attack: this.attack,
      defense: this.defense,
      gold: this.gold,
      floor: this.floor,
      highestFloor: this.highestFloor,
      equipment: this.equipment,
      buffs: this.buffs,
      debuffs: this.debuffs,
      stats: this.stats
    };
  }
  
  static fromJSON(data) {
    const player = new Player(data.name);
    Object.assign(player, data);
    player.recalculateStats();
    return player;
  }
}

module.exports = Player;
