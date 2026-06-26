const chalk = require('chalk');
const { getPhrase, calculateTimeLimit } = require('./wordbank');
const InputHandler = require('./inputHandler');
const {
  resetCombo,
  incrementCombo,
  breakCombo,
  calculatePlayerDamage,
  calculateMonsterDamage,
  isPerfectBlock,
  calculateSpeedBonus,
  getDamageMultiplier,
  getComboBreakComfort,
  getTimeoutComfort,
  getTypoComfort,
  COMBO_THRESHOLD
} = require('./combo');

class BattleSystem {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.inputHandler = new InputHandler(stdin, stdout);
    this.currentBattle = null;
    this.isActive = false;
    this.ui = null;
  }

  setUI(ui) {
    this.ui = ui;
  }

  async startBattle(player, monster, onUpdate) {
    this.isActive = true;
    resetCombo(player);

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
    this.addLog(this.ui ? this.ui.hintText('💡 提示：连续3次完美格挡可触发连击！下一击伤害翻倍！') : chalk.gray('💡 提示：连续3次完美格挡可触发连击！下一击伤害翻倍！'));

    await this.battleLoop();

    if (!player.isAlive()) {
      resetCombo(player);
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

    this.logRoundHeader(player, monster, comboActive, phrase, timeLimit);
    this.notifyUpdate();

    const inputResult = await this.inputHandler.collectInput(phrase, timeLimit);

    let monsterDamage = 0;
    let playerDamage = 0;

    if (inputResult.success) {
      const timeRatio = inputResult.timeUsed / timeLimit;
      const perfect = isPerfectBlock(timeRatio);
      const speedBonus = calculateSpeedBonus(timeRatio);

      playerDamage = calculatePlayerDamage(player, monster, speedBonus);

      monster.hp -= playerDamage;
      results.damageDealt += playerDamage;
      player.dealDamage(playerDamage);

      this.logLifesteal(player, playerDamage);

      if (perfect) {
        this.logPerfectBlock(player, speedBonus, playerDamage, results);
      } else {
        this.logNormalBlock(player, speedBonus, playerDamage);
      }
    } else if (inputResult.timeout) {
      this.logTimeout(player);
      monsterDamage = this.applyMonsterDamage(player, monster, results);
    } else {
      this.logTypo(player, inputResult.input, phrase);
      monsterDamage = this.applyMonsterDamage(player, monster, results);
    }

    this.notifyUpdate();

    return {
      monsterDead: monster.hp <= 0,
      playerDead: !player.isAlive(),
      playerDamage,
      monsterDamage
    };
  }

  logRoundHeader(player, monster, comboActive, phrase, timeLimit) {
    if (comboActive) {
      this.addLog(this.ui ? this.ui.flashText('⚡⚡⚡ 连击发动！⚡⚡⚡') : chalk.yellow.bold('⚡⚡⚡ 连击发动！⚡⚡⚡'));
      this.addLog(this.ui ? this.ui.comboActiveText(`🔥 连击 x${player.comboCount}！下一击伤害翻倍！短语速攻模式！`) : chalk.yellow.bold(`🔥 连击 x${player.comboCount}！下一击伤害翻倍！短语速攻模式！`));
    } else if (player.comboCount > 0) {
      this.addLog(this.ui ? this.ui.comboBuildText(`🔥 连击累积: ${player.comboCount}/${COMBO_THRESHOLD}`) : chalk.yellow(`🔥 连击累积: ${player.comboCount}/${COMBO_THRESHOLD}`));
    }

    this.addLog(`\n--- 第 ${this.currentBattle.round} 回合 ---`);
    this.addLog(`${monster.emoji} ${monster.name} 喊道:`);

    if (comboActive) {
      this.addLog('  ' + (this.ui ? this.ui.comboPhraseText(phrase) : chalk.yellow.bold(`"${phrase}"`)));
    } else {
      this.addLog(`  "${phrase}"`);
    }

    this.addLog(`⏱️ 限时: ${timeLimit.toFixed(1)} 秒`);
  }

  logPerfectBlock(player, speedBonus, playerDamage, results) {
    results.perfectBlocks++;
    player.stats.perfectBlocks++;
    const prevCombo = player.comboCount;
    incrementCombo(player);
    const newCombo = player.comboCount;
    const comboMultiplier = getDamageMultiplier(player.comboCount, player.comboActive);

    if (comboMultiplier > 1.0) {
      this.addLog(this.ui ? this.ui.perfectBlockText(
        `✨ 完美格挡！速度 x${speedBonus.toFixed(2)} + 连击 x${comboMultiplier}！造成 ${playerDamage} 点伤害！`
      ) : chalk.yellow(`✨ 完美格挡！速度 x${speedBonus.toFixed(2)} + 连击 x${comboMultiplier}！造成 ${playerDamage} 点伤害！`));
    } else {
      this.addLog(this.ui ? this.ui.perfectBlockText(
        `✨ 完美格挡！速度加成 x${speedBonus.toFixed(2)}！造成 ${playerDamage} 点伤害！`
      ) : `✨ 完美格挡！速度加成 x${speedBonus.toFixed(2)}！造成 ${playerDamage} 点伤害！`);
    }

    if (prevCombo < COMBO_THRESHOLD && newCombo >= COMBO_THRESHOLD) {
      this.addLog(this.ui ? this.ui.flashText('\n🎉🎉🎉 连击达成！下次攻击伤害翻倍！🎉🎉🎉\n') : chalk.yellow.bold('\n🎉🎉🎉 连击达成！下次攻击伤害翻倍！🎉🎉🎉\n'));
    }
  }

  logNormalBlock(player, speedBonus, playerDamage) {
    const broken = breakCombo(player);
    if (broken.wasActive) {
      this.addLog(this.ui ? this.ui.blockSuccessText(
        `✅ 格挡成功！速度 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`
      ) : chalk.magenta(`✅ 格挡成功！速度 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`));
      const comfort = getComboBreakComfort(broken);
      if (comfort) this.addLog(this.ui ? this.ui.comfortText(comfort) : chalk.cyan('💬 ' + comfort));
    } else if (broken.oldCount > 0) {
      this.addLog(this.ui ? this.ui.blockSuccessText(
        `✅ 格挡成功！速度加成 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`
      ) : `✅ 格挡成功！速度加成 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`);
      const comfort = getComboBreakComfort(broken);
      if (comfort) this.addLog(this.ui ? this.ui.comfortText(comfort) : chalk.cyan('💬 ' + comfort));
    } else {
      this.addLog(`✅ 格挡成功！速度加成 x${speedBonus.toFixed(2)}，造成 ${playerDamage} 点伤害！`);
    }
  }

  logTimeout(player) {
    const broken = breakCombo(player);
    this.addLog(this.ui ? this.ui.damageText('⏰ 超时了！未能格挡攻击！') : chalk.red('⏰ 超时了！未能格挡攻击！'));
    const comfort = getTimeoutComfort(broken);
    if (comfort) this.addLog(this.ui ? this.ui.comfortText(comfort) : chalk.cyan('💬 ' + comfort));
  }

  logTypo(player, input, phrase) {
    const broken = breakCombo(player);
    this.addLog(this.ui ? this.ui.damageText(`❌ 输入错误！"${input}" ≠ "${phrase}"`) : chalk.red(`❌ 输入错误！"${input}" ≠ "${phrase}"`));
    const comfort = getTypoComfort(broken);
    if (comfort) this.addLog(this.ui ? this.ui.comfortText(comfort) : chalk.cyan('💬 ' + comfort));
  }

  applyMonsterDamage(player, monster, results) {
    const monsterDamage = calculateMonsterDamage(player, monster);
    const actualDamage = player.takeDamage(monsterDamage);
    results.damageTaken += actualDamage;
    this.addLog(`💔 受到 ${actualDamage} 点伤害！HP: ${player.hp}/${player.maxHp}`);
    return monsterDamage;
  }

  logLifesteal(player, playerDamage) {
    const lifesteal = player.getLifesteal();
    if (lifesteal > 0) {
      const healAmount = Math.floor(playerDamage * lifesteal);
      if (healAmount > 0) {
        player.heal(healAmount);
        this.addLog(this.ui ? this.ui.lifestealText(`💚 吸血恢复了 ${healAmount} 点生命！`) : `💚 吸血恢复了 ${healAmount} 点生命！`);
      }
    }
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
    this.inputHandler.cancel();
    this.isActive = false;
  }
}

module.exports = BattleSystem;
