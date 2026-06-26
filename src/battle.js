const readline = require('readline');
const { getPhrase, calculateTimeLimit } = require('./wordbank');

class BattleSystem {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.rl = null;
    this.currentBattle = null;
    this.isActive = false;
  }

  async startBattle(player, monster, onUpdate) {
    this.isActive = true;
    this.currentBattle = {
      player,
      monster,
      round: 0,
      log: [],
      onUpdate,
      results: {
        playerWon: false,
        damageDealt: 0,
        damageTaken: 0,
        expGained: 0,
        goldGained: 0,
        perfectBlocks: 0
      }
    };

    this.addLog(`⚔️ 战斗开始！你遇到了 ${monster.emoji} ${monster.name}！`);
    this.addLog(`怪物属性 - HP: ${monster.hp}/${monster.maxHp} | 攻击: ${monster.attack} | 防御: ${monster.defense}`);
    
    await this.battleLoop();
    this.isActive = false;
    
    return this.currentBattle.results;
  }

  async battleLoop() {
    const { player, monster } = this.currentBattle;
    
    while (player.isAlive() && monster.hp > 0) {
      this.currentBattle.round++;
      
      const result = await this.doCombatRound();
      
      if (result.monsterDead) {
        this.currentBattle.results.playerWon = true;
        this.addLog(`🎉 你击败了 ${monster.emoji} ${monster.name}！`);
        
        const expGain = monster.expReward;
        const goldGain = monster.goldReward[0] + Math.floor(Math.random() * (monster.goldReward[1] - monster.goldReward[0]));
        
        player.gainExp(expGain);
        player.gold += goldGain;
        
        this.currentBattle.results.expGained = expGain;
        this.currentBattle.results.goldGained = goldGain;
        
        if (monster.isBoss) {
          player.stats.bossesKilled++;
        } else {
          player.stats.monstersKilled++;
        }
        
        this.addLog(`获得 ${expGain} 经验值, ${goldGain} 金币！`);
        break;
      }
      
      if (result.playerDead) {
        this.addLog(`💀 你被 ${monster.emoji} ${monster.name} 击败了...`);
        break;
      }
      
      this.notifyUpdate();
    }
  }

  async doCombatRound() {
    const { player, monster, results } = this.currentBattle;
    
    const isBoss = monster.isBoss;
    const addNoise = isBoss && monster.hasNoise;
    const phrase = getPhrase(player.floor, isBoss, addNoise);
    
    let timeLimit = calculateTimeLimit(phrase, 0.3, 3);
    if (isBoss) {
      timeLimit = Math.max(5, phrase.length * 0.35);
    }
    
    this.addLog(`\n--- 第 ${this.currentBattle.round} 回合 ---`);
    this.addLog(`${monster.emoji} ${monster.name} 喊道:`);
    this.addLog(`  "${phrase}"`);
    this.addLog(`⏱️ 限时: ${timeLimit.toFixed(1)} 秒`);
    this.notifyUpdate();
    
    const inputResult = await this.waitForInput(phrase, timeLimit);
    
    let monsterDamage = 0;
    let playerDamage = 0;
    
    if (inputResult.success) {
      const timeRatio = inputResult.timeUsed / timeLimit;
      const speedBonus = Math.max(0.5, 2 - timeRatio * 1.5);
      
      const baseDamage = player.attack;
      playerDamage = Math.max(1, Math.floor(baseDamage * speedBonus) - monster.defense);
      
      monster.hp -= playerDamage;
      results.damageDealt += playerDamage;
      player.dealDamage(playerDamage);
      
      const lifesteal = player.getLifesteal();
      if (lifesteal > 0) {
        const healAmount = Math.floor(playerDamage * lifesteal);
        if (healAmount > 0) {
          player.heal(healAmount);
          this.addLog(`💚 吸血恢复了 ${healAmount} 点生命！`);
        }
      }
      
      if (timeRatio < 0.5) {
        results.perfectBlocks++;
        player.stats.perfectBlocks++;
        this.addLog(`✨ 完美格挡！速度加成 x${speedBonus.toFixed(2)}！造成 ${playerDamage} 点伤害！`);
      } else {
        this.addLog(`✅ 格挡成功！速度加成 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`);
      }
      
    } else if (inputResult.timeout) {
      this.addLog(`⏰ 超时了！未能格挡攻击！`);
      monsterDamage = this.calculateMonsterDamage(player, monster);
      const actualDamage = player.takeDamage(monsterDamage);
      results.damageTaken += actualDamage;
      this.addLog(`💔 受到 ${actualDamage} 点伤害！HP: ${player.hp}/${player.maxHp}`);
      
    } else {
      this.addLog(`❌ 输入错误！"${inputResult.input}" ≠ "${phrase}"`);
      monsterDamage = this.calculateMonsterDamage(player, monster);
      const actualDamage = player.takeDamage(monsterDamage);
      results.damageTaken += actualDamage;
      this.addLog(`💔 受到 ${actualDamage} 点伤害！HP: ${player.hp}/${player.maxHp}`);
    }
    
    this.notifyUpdate();
    
    return {
      monsterDead: monster.hp <= 0,
      playerDead: !player.isAlive(),
      playerDamage,
      monsterDamage
    };
  }

  calculateMonsterDamage(player, monster) {
    let damage = monster.attack;
    if (monster.isBoss && monster.attackBonus) {
      damage = Math.floor(damage * monster.attackBonus);
    }
    return damage;
  }

  async waitForInput(expected, timeout) {
    return new Promise((resolve) => {
      let input = '';
      let timedOut = false;
      let startTime = Date.now();
      
      const rl = readline.createInterface({
        input: this.stdin,
        output: this.stdout,
        terminal: true
      });
      
      this.rl = rl;
      
      const timeoutId = setTimeout(() => {
        timedOut = true;
        rl.close();
      }, timeout * 1000);
      
      rl.setPrompt('> ');
      rl.prompt();
      
      rl.on('line', (line) => {
        clearTimeout(timeoutId);
        const timeUsed = (Date.now() - startTime) / 1000;
        rl.close();
        
        if (timedOut) {
          resolve({ success: false, timeout: true, input: line, timeUsed });
        } else {
          resolve({ success: line === expected, timeout: false, input: line, timeUsed });
        }
      });
      
      rl.on('close', () => {
        if (timedOut) {
          const timeUsed = (Date.now() - startTime) / 1000;
          resolve({ success: false, timeout: true, input, timeUsed });
        }
      });
    });
  }

  addLog(message) {
    this.currentBattle.log.push(message);
    if (this.currentBattle.log.length > 50) {
      this.currentBattle.log.shift();
    }
  }

  getLog() {
    return this.currentBattle ? [...this.currentBattle.log] : [];
  }

  notifyUpdate() {
    if (this.currentBattle?.onUpdate) {
      this.currentBattle.onUpdate(this.getLog());
    }
  }

  cancelBattle() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    this.isActive = false;
  }
}

module.exports = BattleSystem;
