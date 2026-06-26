const readline = require('readline');
const keypress = require('keypress');

const Player = require('./player');
const UIRenderer = require('./ui');
const BattleSystem = require('./battle');
const SaveSystem = require('./save');
const { MapGenerator, TILE_TYPES, movePlayer, clearTile, generateEvent } = require('./map');
const { spawnMonster, getBossForFloor, getAllBossFloors } = require('./monsters');
const { generateEquipment, generateBossDrop, compareEquipment, getRarityColor, getRarityName } = require('./equipment');
const { resetCombo } = require('./combo');

class Game {
  constructor() {
    this.player = null;
    this.map = null;
    this.ui = new UIRenderer();
    this.battle = new BattleSystem();
    this.battle.setUI(this.ui);
    this.save = new SaveSystem();
    this.mapGen = new MapGenerator(14, 10);
    
    this.gameState = 'menu';
    this.battleLog = [];
    this.currentMessage = '';
    this.messageColor = 'white';
    this.pendingEvent = null;
    this.pendingLoot = null;
    this.pendingMerchant = null;
    
    this.rl = null;
    this.keypressListener = null;
    
    this.bossFloors = getAllBossFloors();
    this.pendingLootItems = [];
  }

  start() {
    this.setupInput();
    this.showTitleScreen();
  }

  setupInput() {
    keypress(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    this.keypressListener = (ch, key) => {
      this.handleKeyPress(ch, key);
    };
    process.stdin.on('keypress', this.keypressListener);
  }

  cleanupInput() {
    if (this.keypressListener) {
      process.stdin.removeListener('keypress', this.keypressListener);
      this.keypressListener = null;
    }
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  handleKeyPress(ch, key) {
    if (!key) return;
    
    if (key.ctrl && key.name === 'c') {
      this.quit();
      return;
    }
    
    switch (this.gameState) {
      case 'title':
        this.handleTitleInput(key);
        break;
      case 'help':
      case 'gameover':
      case 'victory':
        this.showTitleScreen();
        break;
      case 'menu':
        this.handleMenuInput(key);
        break;
      case 'playing':
        this.handleGameInput(key);
        break;
      case 'battle':
        break;
      case 'event':
        this.handleEventInput(key);
        break;
      case 'loot':
        this.handleLootInput(key);
        break;
      case 'merchant':
        break;
      case 'equip':
        this.handleEquipInput(key);
        break;
    }
  }

  handleTitleInput(key) {
    const hasSave = this.save.hasSave();
    
    switch (key.name) {
      case '1':
        this.startNewGame();
        break;
      case '2':
        if (hasSave) {
          this.continueGame();
        }
        break;
      case '3':
        this.showHelp();
        break;
      case '4':
      case 'escape':
        this.quit();
        break;
    }
  }

  handleMenuInput(key) {
    switch (key.name) {
      case '1':
        this.gameState = 'playing';
        this.render();
        break;
      case '2':
        this.saveGame();
        break;
      case '3':
        this.showHelp();
        break;
      case '4':
      case 'escape':
        this.gameState = 'playing';
        this.render();
        break;
      case '5':
        this.showTitleScreen();
        break;
    }
  }

  handleGameInput(key) {
    let dx = 0, dy = 0;
    
    switch (key.name) {
      case 'up':
      case 'w':
      case 'k':
        dy = -1;
        break;
      case 'down':
      case 's':
      case 'j':
        dy = 1;
        break;
      case 'left':
      case 'a':
      case 'h':
        dx = -1;
        break;
      case 'right':
      case 'd':
      case 'l':
        dx = 1;
        break;
      case 's':
        if (!key.ctrl) {
          this.saveGame();
          return;
        }
        break;
      case 'escape':
        this.showPauseMenu();
        return;
      case '?':
        this.showHelp();
        return;
    }
    
    if (dx !== 0 || dy !== 0) {
      this.movePlayer(dx, dy);
    }
  }

  handleEventInput(key) {
    if (key.name === 'escape' || key.name === 'enter' || key.name === 'space') {
      this.pendingEvent = null;
      this.gameState = 'playing';
      this.currentMessage = '';
      this.render();
    }
  }

  handleLootInput(key) {
    if (!this.pendingLoot) return;
    
    if (key.name === 'y') {
      const { item, slot, oldItem } = this.pendingLoot;
      this.player.equipItem(item);
      this.currentMessage = `装备了 ${item.emoji} ${item.name}！`;
      this.messageColor = 'green';
      this.pendingLoot = null;
      this.gameState = 'playing';
      this.render();
    } else if (key.name === 'n' || key.name === 'escape') {
      this.currentMessage = '放弃了装备。';
      this.messageColor = 'gray';
      this.pendingLoot = null;
      this.gameState = 'playing';
      this.render();
    }
  }

  handleEquipInput(key) {
    if (key.name === 'escape') {
      this.gameState = 'playing';
      this.render();
    }
  }

  showTitleScreen() {
    this.gameState = 'title';
    const highestFloor = this.save.getHighestFloor();
    const hasSave = this.save.hasSave();
    this.ui.drawTitleScreen(highestFloor, hasSave);
  }

  showHelp() {
    const prevState = this.gameState;
    this.gameState = 'help';
    this.ui.drawHelpScreen();
    
    const waitForInput = () => {
      const handler = (ch, key) => {
        if (key) {
          process.stdin.removeListener('keypress', handler);
          if (prevState === 'title') {
            this.showTitleScreen();
          } else {
            this.gameState = prevState;
            this.render();
          }
        }
      };
      process.stdin.once('keypress', handler);
    };
    waitForInput();
  }

  showPauseMenu() {
    this.gameState = 'menu';
    this.ui.clear();
    this.ui.drawStatusBar(this.player);
    this.ui.drawMenu([
      '继续游戏',
      '保存游戏',
      '帮助说明',
      '返回游戏',
      '返回主菜单'
    ], '暂停菜单');
  }

  startNewGame() {
    this.player = new Player('勇者');
    this.generateFloor(1);
    this.gameState = 'playing';
    this.currentMessage = '欢迎来到打字地牢！用方向键或hjkl移动。';
    this.messageColor = 'cyan';
    this.render();
  }

  continueGame() {
    const loadResult = this.save.loadGame();
    if (loadResult.success) {
      this.player = loadResult.player;
      
      if (loadResult.map) {
        this.map = loadResult.map;
      } else {
        this.generateFloor(this.player.floor);
      }
      
      this.gameState = 'playing';
      this.currentMessage = `欢迎回来，${this.player.name}！上次你到达了第 ${loadResult.highestFloor} 层。`;
      this.messageColor = 'green';
      this.render();
    } else {
      this.currentMessage = loadResult.message;
      this.messageColor = 'red';
      this.showTitleScreen();
    }
  }

  generateFloor(floor) {
    const isBossFloor = this.bossFloors.includes(floor);
    
    if (isBossFloor && floor > 10) {
      this.ui.drawBossWarning(floor);
    }
    
    this.map = this.mapGen.generate(floor, isBossFloor);
    this.player.floor = floor;
  }

  movePlayer(dx, dy) {
    const result = movePlayer(this.map, dx, dy);
    
    if (!result.moved) {
      this.currentMessage = '这里走不通！';
      this.messageColor = 'red';
      this.render();
      return;
    }
    
    this.currentMessage = '';
    
    switch (result.tile) {
      case TILE_TYPES.MONSTER:
        this.encounterMonster();
        clearTile(this.map, this.map.playerX, this.map.playerY);
        break;
      case TILE_TYPES.BOSS:
        this.encounterBoss();
        clearTile(this.map, this.map.playerX, this.map.playerY);
        break;
      case TILE_TYPES.EVENT:
        this.triggerEvent();
        clearTile(this.map, this.map.playerX, this.map.playerY);
        break;
      case TILE_TYPES.STAIRS_UP:
        this.goToNextFloor();
        break;
      default:
        this.render();
    }
  }

  encounterMonster() {
    const monster = spawnMonster(this.player.floor);
    if (!monster) {
      this.currentMessage = '这里空无一物...';
      this.messageColor = 'gray';
      this.render();
      return;
    }
    
    this.startBattle(monster);
  }

  encounterBoss() {
    const boss = getBossForFloor(this.player.floor);
    if (!boss) {
      this.goToNextFloor();
      return;
    }
    
    this.startBattle(boss);
  }

  async startBattle(monster) {
    this.gameState = 'battle';
    this.battleLog = [];
    
    if (this.keypressListener) {
      process.stdin.removeListener('keypress', this.keypressListener);
    }
    
    this.render();
    
    const result = await this.battle.startBattle(this.player, monster, (log) => {
      this.battleLog = log;
      this.render();
    });
    
    if (this.keypressListener) {
      process.stdin.on('keypress', this.keypressListener);
    }
    
    resetCombo(this.player);
    
    if (result.playerWon) {
      if (this.player.floor === 50 && monster.id === 'boss_voidlord') {
        this.showVictory();
        return;
      }
      
      let loot = [];
      if (monster.isBoss) {
        loot = generateBossDrop(this.player.floor);
        const goldBonus = 100 + this.player.floor * 20;
        this.player.gold += goldBonus;
        this.currentMessage = `击败了BOSS！额外获得 ${goldBonus} 金币！`;
      } else if (Math.random() < 0.3) {
        const item = generateEquipment(this.player.floor);
        if (item) loot.push(item);
      }
      
      const leveledUp = this.player.gainExp(result.expGained);
      if (leveledUp) {
        this.currentMessage = '🎉 升级了！';
        this.messageColor = 'yellow';
      }
      
      if (loot.length > 0) {
        this.pendingLootItems = loot;
        this.showLootSelection();
      } else {
        this.gameState = 'playing';
        this.render();
      }
    } else {
      this.showGameOver();
    }
  }

  showLootSelection() {
    if (!this.pendingLootItems || this.pendingLootItems.length === 0) {
      this.gameState = 'playing';
      this.render();
      return;
    }
    
    const item = this.pendingLootItems.shift();
    const slot = item.slot;
    const currentItem = this.player.equipment[slot];
    const comparison = compareEquipment(item, currentItem);
    
    this.pendingLoot = { item, slot, currentItem, comparison };
    this.gameState = 'loot';
    this.render();
  }

  triggerEvent() {
    const event = generateEvent(this.player.floor);
    let result = {};
    
    switch (event.type) {
      case 'trap':
        const trapDamage = event.data.damage[0] + Math.floor(Math.random() * (event.data.damage[1] - event.data.damage[0]));
        const actualDamage = this.player.takeDamage(trapDamage);
        result = { damage: actualDamage };
        
        if (!this.player.isAlive()) {
          this.showGameOver();
          return;
        }
        break;
        
      case 'chest':
        const gold = event.data.gold;
        this.player.gold += gold;
        result = { gold };
        
        if (event.data.hasEquipment) {
          const equipment = generateEquipment(this.player.floor);
          if (equipment) {
            result.equipment = equipment;
            this.pendingLootItems = [equipment];
          }
        }
        break;
        
      case 'merchant':
        this.pendingMerchant = event.data.items;
        this.gameState = 'merchant';
        if (this.keypressListener) {
          process.stdin.removeListener('keypress', this.keypressListener);
        }
        this.render();
        this.openMerchant();
        return;
        
      case 'healing':
        const healed = this.player.heal(event.data.amount);
        result = { healed };
        break;
        
      case 'buff':
        const buff = event.data;
        this.player.addBuff(buff);
        const statName = buff.stat === 'attack' ? '攻击' : buff.stat === 'defense' ? '防御' : '生命上限';
        result = { message: `${statName} +${buff.value}${buff.duration > 0 ? ` (持续${buff.duration}层)` : ' (永久)'}` };
        break;
        
      case 'nothing':
        result = { message: event.data.message };
        break;
    }
    
    this.pendingEvent = { event, result };
    this.gameState = 'event';
    this.render();
  }

  async openMerchant() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });
    }
    
    const askQuestion = () => {
      this.rl.question('', (answer) => {
        const choice = parseInt(answer);
        
        if (choice === 0 || isNaN(choice)) {
          this.rl.pause();
          this.pendingMerchant = null;
          this.gameState = 'playing';
          this.currentMessage = '离开了商人。';
          this.messageColor = 'gray';
          if (this.keypressListener) {
            process.stdin.on('keypress', this.keypressListener);
          }
          this.render();
          return;
        }
        
        if (choice >= 1 && choice <= this.pendingMerchant.length) {
          const item = this.pendingMerchant[choice - 1];
          
          if (this.player.gold >= item.price) {
            this.player.gold -= item.price;
            
            if (item.type === 'heal') {
              const healed = this.player.heal(item.value);
              this.currentMessage = `使用了 ${item.name}，恢复了 ${healed} 点生命！`;
              this.messageColor = 'green';
            } else if (item.type === 'buff') {
              if (item.stat === 'attack') this.player.baseAttack += item.value;
              if (item.stat === 'defense') this.player.baseDefense += item.value;
              if (item.stat === 'maxHp') {
                this.player.baseHp += item.value;
                this.player.hp += item.value;
              }
              this.player.recalculateStats();
              this.currentMessage = `使用了 ${item.name}，永久提升！`;
              this.messageColor = 'yellow';
            }
            
            this.pendingMerchant.splice(choice - 1, 1);
          } else {
            this.currentMessage = '金币不足！';
            this.messageColor = 'red';
          }
        }
        
        this.render();
        askQuestion();
      });
    };
    
    askQuestion();
  }

  goToNextFloor() {
    const nextFloor = this.player.floor + 1;
    
    if (nextFloor > 50) {
      this.showVictory();
      return;
    }
    
    this.player.advanceFloor();
    this.generateFloor(nextFloor);
    this.save.autoSave(this.player, this.map);
    this.currentMessage = `来到了第 ${nextFloor} 层！游戏已自动保存。`;
    this.messageColor = 'cyan';
    this.render();
  }

  saveGame() {
    const result = this.save.saveGame(this.player, this.map);
    this.currentMessage = result.message;
    this.messageColor = result.success ? 'green' : 'red';
    this.render();
  }

  showGameOver() {
    this.gameState = 'gameover';
    this.ui.drawGameOver(this.player);
    
    const waitForInput = () => {
      const handler = (ch, key) => {
        if (key) {
          process.stdin.removeListener('keypress', handler);
          this.showTitleScreen();
        }
      };
      process.stdin.once('keypress', handler);
    };
    waitForInput();
  }

  showVictory() {
    this.gameState = 'victory';
    this.ui.drawVictory(this.player);
    
    const waitForInput = () => {
      const handler = (ch, key) => {
        if (key) {
          process.stdin.removeListener('keypress', handler);
          this.showTitleScreen();
        }
      };
      process.stdin.once('keypress', handler);
    };
    waitForInput();
  }

  render() {
    this.ui.clear();
    
    if (this.player) {
      this.ui.drawStatusBar(this.player);
    }
    
    switch (this.gameState) {
      case 'playing':
        if (this.map) {
          this.ui.drawMap(this.map, this.player);
        }
        this.ui.drawHelp();
        if (this.currentMessage) {
          this.ui.drawMessage(this.currentMessage, this.messageColor);
        }
        break;
        
      case 'battle':
        this.ui.drawMap(this.map, this.player);
        this.ui.drawBattleLog(this.battleLog);
        break;
        
      case 'event':
        this.ui.drawMap(this.map, this.player);
        if (this.pendingEvent) {
          this.ui.drawEventResult(this.pendingEvent.event, this.pendingEvent.result);
        }
        this.ui.drawMessage('按任意键继续...', 'gray');
        break;
        
      case 'loot':
        this.ui.drawMap(this.map, this.player);
        if (this.pendingLoot) {
          this.ui.drawEquipmentComparison(
            this.pendingLoot.item,
            this.pendingLoot.currentItem,
            this.pendingLoot.comparison
          );
        }
        break;
        
      case 'merchant':
        this.ui.drawMap(this.map, this.player);
        if (this.pendingMerchant) {
          this.ui.drawMerchant(this.pendingMerchant, this.player.gold);
        }
        break;
        
      case 'menu':
        break;
    }
    
    if (this.player?.exp >= this.player?.expToNext - 1) {
      this.ui.drawLevelUp(this.player);
    }
  }

  quit() {
    this.cleanupInput();
    this.ui.clear();
    console.log(chalk.yellow('感谢游玩！再见！'));
    process.exit(0);
  }
}

const chalk = require('chalk');

module.exports = Game;
