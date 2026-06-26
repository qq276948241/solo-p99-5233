const readline = require('readline');
const chalk = require('chalk');
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
    player.resetCombo();
    
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
    this.addLog(chalk.gray('💡 提示：连续3次完美格挡可触发连击！下一击伤害翻倍！'));
    
    await this.battleLoop();
    
    if (!player.isAlive()) {
      player.resetCombo();
    }
    
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
    const comboActive = player.comboActive;
    const phrase = getPhrase(player.floor, isBoss, addNoise, comboActive);
    
    let timeLimit = calculateTimeLimit(phrase, 0.3, 3, comboActive);
    if (isBoss) {
      timeLimit = Math.max(5, phrase.length * 0.35);
    }
    
    if (comboActive) {
      this.addLog(chalk.yellow('⚡⚡⚡ 连击发动！⚡⚡⚡'));
      this.addLog(chalk.yellow(`🔥 连击 x${player.comboCount}！下一击伤害翻倍！短语速攻模式！`));
    } else if (player.comboCount > 0) {
      this.addLog(chalk.yellow(`🔥 连击累积: ${player.comboCount}/3`));
    }
    
    this.addLog(`\n--- 第 ${this.currentBattle.round} 回合 ---`);
    this.addLog(`${monster.emoji} ${monster.name} 喊道:`);
    
    if (comboActive) {
      this.addLog(`  ${chalk.yellow('"')}${chalk.yellow.bold(phrase)}${chalk.yellow('"')}`);
    } else {
      this.addLog(`  "${phrase}"`);
    }
    
    this.addLog(`⏱️ 限时: ${timeLimit.toFixed(1)} 秒`);
    this.notifyUpdate();
    
    const inputResult = await this.waitForInput(phrase, timeLimit);
    
    let monsterDamage = 0;
    let playerDamage = 0;
    
    if (inputResult.success) {
      const timeRatio = inputResult.timeUsed / timeLimit;
      const isPerfect = timeRatio < 0.5;
      const speedBonus = Math.max(0.5, 2 - timeRatio * 1.5);
      
      const comboMultiplier = player.getComboDamageMultiplier();
      const baseDamage = player.attack;
      playerDamage = Math.max(1, Math.floor(baseDamage * speedBonus * comboMultiplier) - monster.defense);
      
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
      
      if (isPerfect) {
        results.perfectBlocks++;
        player.stats.perfectBlocks++;
        const prevCombo = player.comboCount;
        player.incrementCombo(true);
        const newCombo = player.comboCount;
        
        if (comboMultiplier > 1.0) {
          this.addLog(
            chalk.yellow(
              `✨ 完美格挡！速度 x${speedBonus.toFixed(2)} + 连击 x${comboMultiplier}！` +
              `造成 ${playerDamage} 点伤害！`
            )
          );
        } else {
          this.addLog(
            `✨ 完美格挡！速度加成 x${speedBonus.toFixed(2)}！造成 ${playerDamage} 点伤害！`
          );
        }
        
        if (prevCombo < 3 && newCombo >= 3) {
          this.addLog(chalk.yellow.bold('\n🎉🎉🎉 连击达成！下次攻击伤害翻倍！🎉🎉🎉\n'));
        }
      } else {
        const broken = player.breakCombo();
        if (broken.wasActive) {
          this.addLog(
            chalk.magenta(
              `✅ 格挡成功！速度 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`
            )
          );
          this.addLog(chalk.cyan('💬 连击中断了，不过这次攻击已经享受到加成啦！再来！'));
        } else if (broken.oldCount > 0) {
          this.addLog(
            `✅ 格挡成功！速度加成 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`
          );
          this.addLog(chalk.cyan('💬 只差一点就完美了，连击重置了，下次加油！'));
        } else {
          this.addLog(
            `✅ 格挡成功！速度加成 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`
          );
        }
      }
      
    } else if (inputResult.timeout) {
      const broken = player.breakCombo();
      this.addLog(chalk.red(`⏰ 超时了！未能格挡攻击！`));
      
      if (broken.wasActive) {
        this.addLog(chalk.cyan('💬 哎呀连击断了！别灰心，深呼吸，下一次一定可以的！'));
      } else if (broken.oldCount > 0) {
        this.addLog(chalk.cyan('💬 手速慢了一点点！没关系，重新来过！'));
      }
      
      monsterDamage = this.calculateMonsterDamage(player, monster);
      const actualDamage = player.takeDamage(monsterDamage);
      results.damageTaken += actualDamage;
      this.addLog(`💔 受到 ${actualDamage} 点伤害！HP: ${player.hp}/${player.maxHp}`);
      
    } else {
      const broken = player.breakCombo();
      this.addLog(chalk.red(`❌ 输入错误！"${inputResult.input}" ≠ "${phrase}"`));
      
      if (broken.wasActive) {
        this.addLog(chalk.cyan('💬 连击没了好可惜！不过别管它，专注下一击吧！'));
      } else if (broken.oldCount > 0) {
        this.addLog(chalk.cyan('💬 一个小失误！稳下来，慢慢敲就好～'));
      } else {
        this.addLog(chalk.cyan('💬 输错啦，下次看仔细一点哦！'));
      }
      
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
