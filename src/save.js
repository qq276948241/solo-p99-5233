const fs = require('fs');
const path = require('path');
const Player = require('./player');

const SAVE_DIR = path.join(process.cwd(), 'saves');
const SAVE_FILE = path.join(SAVE_DIR, 'game_save.json');

class SaveSystem {
  constructor() {
    this.ensureSaveDir();
  }

  ensureSaveDir() {
    if (!fs.existsSync(SAVE_DIR)) {
      fs.mkdirSync(SAVE_DIR, { recursive: true });
    }
  }

  saveGame(player, map = null) {
    this.ensureSaveDir();
    
    const saveData = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      player: player.toJSON(),
      map: map ? {
        tiles: map.tiles,
        visited: map.visited,
        width: map.width,
        height: map.height,
        playerX: map.playerX,
        playerY: map.playerY,
        stairsX: map.stairsX,
        stairsY: map.stairsY,
        floor: map.floor,
        isBossFloor: map.isBossFloor
      } : null,
      highestFloor: player.highestFloor
    };
    
    try {
      fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData, null, 2), 'utf8');
      return { success: true, message: '游戏已保存！' };
    } catch (error) {
      return { success: false, message: `保存失败: ${error.message}` };
    }
  }

  loadGame() {
    if (!this.hasSave()) {
      return { success: false, message: '没有找到存档文件' };
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      const player = Player.fromJSON(data.player);
      
      return {
        success: true,
        player,
        map: data.map,
        highestFloor: data.highestFloor || player.highestFloor,
        savedAt: data.savedAt,
        message: '存档加载成功！'
      };
    } catch (error) {
      return { success: false, message: `读取存档失败: ${error.message}` };
    }
  }

  hasSave() {
    return fs.existsSync(SAVE_FILE);
  }

  getSaveInfo() {
    if (!this.hasSave()) {
      return null;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      return {
        savedAt: data.savedAt,
        playerName: data.player?.name || '未知',
        playerLevel: data.player?.level || 1,
        highestFloor: data.highestFloor || data.player?.highestFloor || 1,
        playerHp: data.player?.hp || 0,
        playerMaxHp: data.player?.maxHp || 0,
        gold: data.player?.gold || 0
      };
    } catch (error) {
      return null;
    }
  }

  getHighestFloor() {
    const info = this.getSaveInfo();
    return info ? info.highestFloor : 1;
  }

  deleteSave() {
    if (this.hasSave()) {
      try {
        fs.unlinkSync(SAVE_FILE);
        return { success: true, message: '存档已删除' };
      } catch (error) {
        return { success: false, message: `删除存档失败: ${error.message}` };
      }
    }
    return { success: true, message: '没有存档可删除' };
  }

  autoSave(player, map) {
    return this.saveGame(player, map);
  }

  quickSave(player, map) {
    const result = this.saveGame(player, map);
    return result;
  }
}

module.exports = SaveSystem;
