const chalk = require('chalk');
const { TILE_TYPES, getVisibleTiles } = require('./map');
const { getRarityColor, getRarityName } = require('./equipment');

class UIRenderer {
  constructor(stdout = process.stdout) {
    this.stdout = stdout;
    this.width = 80;
    this.height = 24;
  }

  flashText(text) {
    return '\x1b[5m' + chalk.bgYellow.black.bold(text) + '\x1b[0m';
  }

  shakeText(text) {
    return chalk.red.bold(text);
  }

  comboActiveText(text) {
    return chalk.yellow.bold(text);
  }

  comboBuildText(text) {
    return chalk.yellow(text);
  }

  perfectBlockText(text) {
    return chalk.yellow(text);
  }

  blockSuccessText(text) {
    return chalk.green(text);
  }

  damageText(text) {
    return chalk.red(text);
  }

  comfortText(text) {
    return chalk.cyan('💬 ' + text);
  }

  lifestealText(text) {
    return chalk.cyan(text);
  }

  defeatText(text) {
    return chalk.magenta(text);
  }

  hintText(text) {
    return chalk.gray(text);
  }

  comboPhraseText(phrase) {
    return chalk.yellow('"') + chalk.yellow.bold(phrase) + chalk.yellow('"');
  }

  clear() {
    this.stdout.write('\x1Bc');
  }

  moveCursor(x, y) {
    this.stdout.write(`\x1B[${y + 1};${x + 1}H`);
  }

  drawStatusBar(player) {
    const hpPercent = player.hp / player.maxHp;
    let hpColor;
    if (hpPercent > 0.6) hpColor = 'green';
    else if (hpPercent > 0.3) hpColor = 'yellow';
    else hpColor = 'red';
    
    const hpBar = this.createBar(player.hp, player.maxHp, 20, hpColor);
    const expBar = this.createBar(player.exp, player.expToNext, 15, 'cyan');
    
    const floorText = `🏰 第 ${player.floor} 层`;
    const levelText = `⭐ Lv.${player.level}`;
    const hpText = `${chalk[hpColor](`HP: ${player.hp}/${player.maxHp}`)}`;
    const expText = `${chalk.cyan(`EXP: ${player.exp}/${player.expToNext}`)}`;
    const goldText = `💰 ${player.gold}`;
    const attackText = `⚔️ ${player.attack}`;
    const defenseText = `🛡️ ${player.defense}`;
    
    let comboText = '';
    if (player.comboActive) {
      comboText = `  ${chalk.bgYellow.black.bold(` ⚡连击 x${player.comboCount} x2伤害！ `)}`;
    } else if (player.comboCount > 0) {
      comboText = `  ${chalk.bgYellow.black(` 🔥连击: ${player.comboCount}/3 `)}`;
    }
    
    const weapon = player.equipment.weapon ? `${player.equipment.weapon.emoji} ${player.equipment.weapon.name}` : '空手';
    const armor = player.equipment.armor ? `${player.equipment.armor.emoji} ${player.equipment.armor.name}` : '无';
    const accessory = player.equipment.accessory ? `${player.equipment.accessory.emoji} ${player.equipment.accessory.name}` : '无';
    
    let line1 = ` ${floorText}  ${levelText}  ${hpText} ${hpBar}  ${expText} ${expBar}  ${goldText}${comboText}`;
    const line2 = ` ${attackText}  ${defenseText}  武器: ${weapon}  护甲: ${armor}  饰品: ${accessory}`;
    
    let line1Bg;
    if (player.comboActive) {
      line1Bg = chalk.bgYellow.black(line1.padEnd(this.width, ' '));
    } else if (player.comboCount > 0) {
      line1Bg = chalk.bgWhite.black(line1.padEnd(this.width, ' '));
    } else {
      line1Bg = chalk.bgWhite.black(line1.padEnd(this.width, ' '));
    }
    
    this.stdout.write(line1Bg + '\n');
    this.stdout.write(chalk.bgGray.white(line2.padEnd(this.width, ' ') + '\n'));
    this.stdout.write(chalk.bgWhite(' '.repeat(this.width) + '\n'));
  }

  createBar(current, max, length, color = 'white') {
    const percent = Math.max(0, Math.min(1, current / max));
    const filled = Math.floor(length * percent);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return chalk[color](`[${bar}]`);
  }

  drawMap(map, player) {
    const visible = getVisibleTiles(map, 4);
    const visibleSet = new Set(visible.map(v => `${v.x},${v.y}`));
    
    this.stdout.write('  ' + '╔' + '═'.repeat(map.width) + '╗\n');
    
    for (let y = 0; y < map.height; y++) {
      let line = '  ║';
      
      for (let x = 0; x < map.width; x++) {
        const isVisible = visibleSet.has(`${x},${y}`);
        const isVisited = map.visited[y][x];
        const isPlayer = x === map.playerX && y === map.playerY;
        
        if (isPlayer) {
          line += chalk.blue('@');
        } else if (isVisible || isVisited) {
          const tile = map.tiles[y][x];
          line += this.colorTile(tile, isVisible);
        } else {
          line += chalk.gray(TILE_TYPES.FOG);
        }
      }
      
      line += '║';
      this.stdout.write(line + '\n');
    }
    
    this.stdout.write('  ╚' + '═'.repeat(map.width) + '╝\n');
    
    this.drawMapLegend();
  }

  colorTile(tile, isVisible) {
    const dim = isVisible ? (s) => s : chalk.gray;
    
    switch (tile) {
      case TILE_TYPES.WALL:
        return dim(chalk.white('#'));
      case TILE_TYPES.FLOOR:
        return dim(chalk.gray('.'));
      case TILE_TYPES.STAIRS_UP:
        return chalk.yellow('<');
      case TILE_TYPES.MONSTER:
        return chalk.red('M');
      case TILE_TYPES.EVENT:
        return chalk.magenta('?');
      case TILE_TYPES.BOSS:
        return chalk.bgRed.white('B');
      default:
        return dim(chalk.gray('.'));
    }
  }

  drawMapLegend() {
    const legend = [
      chalk.blue('@') + '玩家',
      chalk.red('M') + '怪物',
      chalk.magenta('?') + '事件',
      chalk.yellow('<') + '楼梯',
      chalk.bgRed.white('B') + 'BOSS',
      chalk.white('#') + '墙',
      chalk.gray('░') + '迷雾'
    ];
    this.stdout.write('  ' + legend.join('  ') + '\n\n');
  }

  drawHelp() {
    this.stdout.write(chalk.cyan('移动: ') + '↑↓←→ 或 hjkl  ');
    this.stdout.write(chalk.cyan('保存: ') + 's  ');
    this.stdout.write(chalk.cyan('菜单: ') + 'ESC  ');
    this.stdout.write(chalk.cyan('帮助: ') + '?  ');
    this.stdout.write('\n\n');
  }

  drawMessage(message, color = 'white') {
    this.stdout.write(chalk[color](message) + '\n\n');
  }

  drawBattleLog(logs) {
    this.stdout.write(chalk.yellow('=== 战斗日志 ===\n'));
    const recentLogs = logs.slice(-15);
    
    for (const log of recentLogs) {
      let coloredLog = log;
      
      if (log.includes('连击达成') || log.includes('🎉🎉🎉')) {
        coloredLog = this.flashText(log);
      } else if (log.includes('连击发动') || log.includes('⚡⚡⚡')) {
        coloredLog = this.flashText(log);
      } else if (log.includes('连击 x') || log.includes('🔥 连击 x')) {
        coloredLog = this.comboActiveText(log);
      } else if (log.includes('连击累积')) {
        coloredLog = this.comboBuildText(log);
      } else if (log.includes('连击断') || log.includes('连击中断') || log.includes('连击没了') || log.includes('连击重置')) {
        coloredLog = this.shakeText(log);
      } else if (log.includes('完美格挡') || log.includes('✨')) {
        if (log.includes('连击 x')) {
          coloredLog = chalk.bgYellow.black(log);
        } else {
          coloredLog = this.perfectBlockText(log);
        }
      } else if (log.includes('格挡成功') || log.includes('✅')) {
        coloredLog = this.blockSuccessText(log);
      } else if (log.includes('受到') || log.includes('💔') || log.includes('❌') || log.includes('超时')) {
        coloredLog = this.damageText(log);
      } else if (log.includes('击败') || log.includes('🎉')) {
        coloredLog = this.defeatText(log);
      } else if (log.includes('获得') || log.includes('💚') || log.includes('吸血')) {
        coloredLog = this.lifestealText(log);
      }
      
      this.stdout.write(coloredLog + '\n');
    }
    this.stdout.write('\n');
  }

  drawEquipmentComparison(newItem, currentItem, comparison) {
    const rarityColor = getRarityColor(newItem.rarity);
    
    this.stdout.write(chalk.yellow('=== 装备对比 ===\n'));
    
    this.stdout.write(chalk[rarityColor](`新装备: ${newItem.emoji} ${newItem.name} (${getRarityName(newItem.rarity)})\n`));
    this.drawItemStats(newItem);
    
    if (currentItem) {
      const currentRarityColor = getRarityColor(currentItem.rarity);
      this.stdout.write(chalk[currentRarityColor](`当前装备: ${currentItem.emoji} ${currentItem.name} (${getRarityName(currentItem.rarity)})\n`));
      this.drawItemStats(currentItem);
    } else {
      this.stdout.write('当前装备: 空槽位\n');
    }
    
    if (comparison.better) {
      this.stdout.write(chalk.green(`\n✨ 推荐装备！${comparison.reason}\n`));
    } else {
      this.stdout.write(chalk.yellow(`\n⚠️  ${comparison.reason}\n`));
    }
    
    this.stdout.write(chalk.cyan('\n是否装备？(y/n): '));
  }

  drawItemStats(item) {
    const stats = [];
    if (item.attack) stats.push(`⚔️攻击 +${item.attack}`);
    if (item.defense) stats.push(`🛡️防御 +${item.defense}`);
    if (item.maxHp) stats.push(`❤️生命 +${item.maxHp}`);
    if (item.lifesteal) stats.push(`🩸吸血 +${(item.lifesteal * 100).toFixed(0)}%`);
    this.stdout.write('  ' + stats.join('  ') + '\n');
  }

  drawMerchant(items, gold) {
    this.stdout.write(chalk.yellow('=== 🧙 神秘商人 ===\n'));
    this.stdout.write(`你的金币: 💰 ${gold}\n\n`);
    
    items.forEach((item, idx) => {
      const canAfford = gold >= item.price;
      const priceColor = canAfford ? 'green' : 'red';
      this.stdout.write(`${idx + 1}. ${item.emoji} ${item.name} - ${chalk[priceColor](`${item.price}金币`)}`);
      if (item.type === 'heal') this.stdout.write(` (恢复 ${item.value} HP)`);
      if (item.type === 'buff') this.stdout.write(` (永久+${item.value} ${item.stat})`);
      this.stdout.write('\n');
    });
    
    this.stdout.write('\n输入数字购买 (0离开): ');
  }

  drawEventResult(event, result) {
    this.stdout.write(chalk.yellow(`=== ${event.emoji} 事件 ===\n`));
    
    switch (event.type) {
      case 'trap':
        this.stdout.write(chalk.red(`${event.data.description}\n`));
        this.stdout.write(chalk.red(`受到 ${result.damage} 点伤害！\n`));
        break;
      case 'chest':
        this.stdout.write(chalk.green('你发现了一个宝箱！\n'));
        this.stdout.write(chalk.yellow(`获得 ${result.gold} 金币！\n`));
        if (result.equipment) {
          const rarityColor = getRarityColor(result.equipment.rarity);
          this.stdout.write(chalk[rarityColor](`获得装备: ${result.equipment.emoji} ${result.equipment.name}！\n`));
        }
        break;
      case 'healing':
        this.stdout.write(chalk.green('你发现了一处治愈之泉！\n'));
        this.stdout.write(chalk.green(`恢复了 ${result.healed} 点生命值！\n`));
        break;
      case 'buff':
        this.stdout.write(chalk.magenta('你获得了神秘的祝福！\n'));
        this.stdout.write(chalk.magenta(`${result.message}\n`));
        break;
      case 'nothing':
        this.stdout.write(chalk.gray(`${event.data.message}\n`));
        break;
    }
    this.stdout.write('\n');
  }

  drawMenu(options, title = '菜单') {
    this.stdout.write(chalk.yellow(`=== ${title} ===\n`));
    options.forEach((opt, idx) => {
      this.stdout.write(`${idx + 1}. ${opt}\n`);
    });
    this.stdout.write('\n请选择: ');
  }

  drawTitleScreen(highestFloor = 1, hasSave = false) {
    this.clear();
    
    const title = `
    ████████╗██╗   ██╗██████╗ ███████╗    ██████╗  █████╗ ████████╗████████╗██╗     ███████╗
    ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝    ██╔══██╗██╔══██╗╚══██╔══╝╚══██╔══╝██║     ██╔════╝
       ██║    ╚████╔╝ ██████╔╝█████╗      ██████╔╝███████║   ██║      ██║   ██║     █████╗  
       ██║     ╚██╔╝  ██╔══██╗██╔══╝      ██╔══██╗██╔══██║   ██║      ██║   ██║     ██╔══╝  
       ██║      ██║   ██████╔╝███████╗    ██████╔╝██║  ██║   ██║      ██║   ███████╗███████╗
       ╚═╝      ╚═╝   ╚═════╝ ╚══════╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚══════╝
                                                                                              
                                    ████████╗██╗   ██╗██████╗ ███████╗
                                    ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝
                                       ██║    ╚████╔╝ ██████╔╝█████╗  
                                       ██║     ╚██╔╝  ██╔══██╗██╔══╝  
                                       ██║      ██║   ██████╔╝███████╗
                                       ╚═╝      ╚═╝   ╚═════╝ ╚══════╝
    `;
    
    this.stdout.write(chalk.red(title) + '\n');
    this.stdout.write(chalk.cyan('                        打字战斗 · 地牢探险 · Roguelike\n\n'));
    
    if (highestFloor > 1) {
      this.stdout.write(chalk.yellow(`                        🏆 历史最高层: 第 ${highestFloor} 层\n\n`));
    }
    
    const options = [
      '新游戏',
      hasSave ? '继续游戏' : '继续游戏 (无存档)',
      '帮助说明',
      '退出游戏'
    ];
    
    options.forEach((opt, idx) => {
      const disabled = opt.includes('(无存档)');
      const line = `                        ${idx + 1}. ${opt}\n`;
      this.stdout.write(disabled ? chalk.gray(line) : chalk.white(line));
    });
    
    this.stdout.write('\n                        请选择: ');
  }

  drawGameOver(player) {
    this.clear();
    
    const gameOver = `
    ██████╗  █████╗ ███╗   ███╗███████╗     ██████╗ ██╗   ██╗███████╗██████╗ 
    ██╔════╝ ██╔══██╗████╗ ████║██╔════╝    ██╔═══██╗██║   ██║██╔════╝██╔══██╗
    ██║  ███╗███████║██╔████╔██║█████╗      ██║   ██║██║   ██║█████╗  ██████╔╝
    ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝      ██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗
    ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗    ╚██████╔╝ ╚████╔╝ ███████╗██║  ██║
     ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝     ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝
    `;
    
    this.stdout.write(chalk.red(gameOver) + '\n\n');
    
    this.stdout.write(chalk.yellow('=== 冒险结束 ===\n'));
    this.stdout.write(`勇者: ${player.name}\n`);
    this.stdout.write(`等级: Lv.${player.level}\n`);
    this.stdout.write(`到达层数: 第 ${player.floor} 层\n`);
    this.stdout.write(`历史最高: 第 ${player.highestFloor} 层\n\n`);
    
    this.stdout.write(chalk.cyan('=== 统计数据 ===\n'));
    this.stdout.write(`击杀怪物: ${player.stats.monstersKilled}\n`);
    this.stdout.write(`击杀BOSS: ${player.stats.bossesKilled}\n`);
    this.stdout.write(`造成伤害: ${player.stats.totalDamageDealt}\n`);
    this.stdout.write(`受到伤害: ${player.stats.totalDamageTaken}\n`);
    this.stdout.write(`完美格挡: ${player.stats.perfectBlocks}\n`);
    this.stdout.write(`获得物品: ${player.stats.itemsCollected}\n`);
    this.stdout.write(chalk.yellow(`最高连击: ${player.stats.maxCombo || 0}\n`));
    this.stdout.write(chalk.red(`连击中断: ${player.stats.comboBreaks || 0}\n\n`));
    
    this.stdout.write(chalk.green('按任意键返回主菜单...'));
  }

  drawVictory(player) {
    this.clear();
    
    const victory = `
    ██╗   ██╗██╗ ██████╗████████╗ ██████╗ ██████╗ ██╗   ██╗
    ██║   ██║██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝
    ██║   ██║██║██║        ██║   ██║   ██║██████╔╝ ╚████╔╝ 
    ╚██╗ ██╔╝██║██║        ██║   ██║   ██║██╔══██╗  ╚██╔╝  
     ╚████╔╝ ██║╚██████╗   ██║   ╚██████╔╝██║  ██║   ██║   
      ╚═══╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
    `;
    
    this.stdout.write(chalk.green(victory) + '\n\n');
    
    this.stdout.write(chalk.yellow('🎉 恭喜你击败了虚空之主，拯救了世界！\n\n'));
    
    this.stdout.write(`勇者: ${player.name}\n`);
    this.stdout.write(`最终等级: Lv.${player.level}\n`);
    this.stdout.write(`通关层数: 第 ${player.floor} 层\n\n`);
    
    this.stdout.write(chalk.cyan('=== 最终统计 ===\n'));
    this.stdout.write(`击杀怪物: ${player.stats.monstersKilled}\n`);
    this.stdout.write(`击杀BOSS: ${player.stats.bossesKilled}\n`);
    this.stdout.write(`造成伤害: ${player.stats.totalDamageDealt}\n`);
    this.stdout.write(`受到伤害: ${player.stats.totalDamageTaken}\n`);
    this.stdout.write(`完美格挡: ${player.stats.perfectBlocks}\n`);
    this.stdout.write(`获得物品: ${player.stats.itemsCollected}\n`);
    this.stdout.write(chalk.yellow(`最高连击: ${player.stats.maxCombo || 0}\n`));
    this.stdout.write(chalk.red(`连击中断: ${player.stats.comboBreaks || 0}\n\n`));
    
    this.stdout.write(chalk.green('按任意键返回主菜单...'));
  }

  drawLevelUp(player) {
    this.stdout.write(chalk.yellow('\n╔' + '═'.repeat(50) + '╗\n'));
    this.stdout.write(chalk.yellow('║') + chalk.green(`  🎉 升级了！当前等级: Lv.${player.level}`).padEnd(49) + chalk.yellow('║\n'));
    this.stdout.write(chalk.yellow('║') + `  生命上限 +15, 攻击力 +3, 防御力 +2`.padEnd(49) + chalk.yellow('║\n'));
    this.stdout.write(chalk.yellow('║') + `  生命已完全恢复！`.padEnd(49) + chalk.yellow('║\n'));
    this.stdout.write(chalk.yellow('╚' + '═'.repeat(50) + '╝\n\n'));
  }

  drawBossWarning(floor) {
    this.stdout.write(chalk.red('\n╔' + '═'.repeat(50) + '╗\n'));
    this.stdout.write(chalk.red('║') + chalk.bgRed.white(`  ⚠️  警告！第 ${floor} 层是BOSS层！`).padEnd(49) + chalk.red('║\n'));
    this.stdout.write(chalk.red('║') + `  BOSS的攻击语句更长，还会带有干扰字符！`.padEnd(49) + chalk.red('║\n'));
    this.stdout.write(chalk.red('║') + `  请做好准备，深呼吸...`.padEnd(49) + chalk.red('║\n'));
    this.stdout.write(chalk.red('╚' + '═'.repeat(50) + '╝\n\n'));
  }

  drawHelpScreen() {
    this.clear();
    this.stdout.write(chalk.yellow('=== 游戏帮助 ===\n\n'));
    
    this.stdout.write(chalk.cyan('【游戏目标】\n'));
    this.stdout.write('在地牢中一层层向上爬，击败怪物，收集装备，最终击败第50层的虚空之主！\n\n');
    
    this.stdout.write(chalk.cyan('【战斗系统】\n'));
    this.stdout.write('遇到怪物时，怪物会喊出一句话，你需要在限定时间内原样输入才算格挡成功。\n');
    this.stdout.write('• 输入正确：成功格挡，并根据输入速度造成反击伤害\n');
    this.stdout.write('• 输入错误：被怪物击中，受到伤害\n');
    this.stdout.write('• 超时未输入：被怪物击中，受到伤害\n');
    this.stdout.write('• 输入速度越快，伤害越高！50%时间内完成还会触发完美格挡！\n\n');
    
    this.stdout.write(chalk.cyan('【连击系统】 ⚡\n'));
    this.stdout.write(chalk.yellow('• 连续3次完美格挡即可触发连击！\n'));
    this.stdout.write('• 触发连击后，下一击伤害翻倍（x2.0），并且怪物的话会变短！\n');
    this.stdout.write('• 连击累积中也会获得小加成：1次完美+10%，2次完美+30%\n');
    this.stdout.write(chalk.red('• 一旦输入错误、超时、或非完美格挡，连击就会清零\n'));
    this.stdout.write('• 没关系，失误会有暖心提示安慰你，重整旗鼓再战！\n\n');
    
    this.stdout.write(chalk.cyan('【地图操作】\n'));
    this.stdout.write('• 方向键 / WASD / HJKL：移动角色\n');
    this.stdout.write('• S：保存游戏\n');
    this.stdout.write('• ESC：打开菜单\n');
    this.stdout.write('• ?：显示帮助\n\n');
    
    this.stdout.write(chalk.cyan('【地图图例】\n'));
    this.stdout.write(`${chalk.blue('@')} 玩家  ${chalk.red('M')} 怪物  ${chalk.magenta('?')} 随机事件  ${chalk.yellow('<')} 楼梯  ${chalk.bgRed.white('B')} BOSS\n\n`);
    
    this.stdout.write(chalk.cyan('【装备系统】\n'));
    this.stdout.write('装备分为武器、护甲、饰品三个槽位。\n');
    this.stdout.write('稀有度：普通(白) → 优秀(绿) → 稀有(蓝) → 史诗(紫) → 传说(金)\n\n');
    
    this.stdout.write(chalk.cyan('【BOSS战】\n'));
    this.stdout.write('每10层有一个BOSS，BOSS的攻击语句更长，还带有干扰字符！\n');
    this.stdout.write('击败BOSS会获得更好的装备奖励。\n\n');
    
    this.stdout.write(chalk.green('按任意键返回...'));
  }
}

module.exports = UIRenderer;
