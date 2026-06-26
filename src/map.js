const TILE_TYPES = {
  FLOOR: '.',
  WALL: '#',
  PLAYER: '@',
  STAIRS_UP: '<',
  MONSTER: 'M',
  EVENT: '?',
  CHEST: 'C',
  TRAP: 'T',
  MERCHANT: '$',
  BOSS: 'B',
  VISITED: ' ',
  FOG: '░'
};

const EVENT_TYPES = ['trap', 'chest', 'merchant', 'healing', 'buff', 'nothing'];

const TRAP_TYPES = [
  { name: '地刺陷阱', damage: [10, 20], description: '你踩到了地刺！' },
  { name: '毒气陷阱', damage: [15, 25], description: '一股毒气喷涌而出！' },
  { name: '落石陷阱', damage: [20, 30], description: '头顶的石头砸了下来！' },
  { name: '诅咒陷阱', damage: [5, 15], debuff: true, description: '你被诅咒了！' }
];

const MERCHANT_ITEMS = [
  { name: '小型生命药水', type: 'heal', value: 30, price: 20, emoji: '🧪' },
  { name: '中型生命药水', type: 'heal', value: 60, price: 45, emoji: '🍷' },
  { name: '大型生命药水', type: 'heal', value: 100, price: 80, emoji: '⚗️' },
  { name: '力量卷轴', type: 'buff', stat: 'attack', value: 5, price: 60, emoji: '📜' },
  { name: '防护卷轴', type: 'buff', stat: 'defense', value: 5, price: 60, emoji: '📃' },
  { name: '生命宝石', type: 'buff', stat: 'maxHp', value: 20, price: 80, emoji: '💎' }
];

class MapGenerator {
  constructor(width = 12, height = 10) {
    this.width = width;
    this.height = height;
  }

  generate(floor, isBossFloor = false) {
    const map = this.createEmptyMap();
    this.carveRooms(map);
    
    let playerX, playerY;
    do {
      playerX = Math.floor(Math.random() * (this.width - 2)) + 1;
      playerY = Math.floor(Math.random() * (this.height - 2)) + 1;
    } while (map[playerY][playerX] !== TILE_TYPES.FLOOR);
    
    let stairsX, stairsY;
    do {
      stairsX = Math.floor(Math.random() * (this.width - 2)) + 1;
      stairsY = Math.floor(Math.random() * (this.height - 2)) + 1;
    } while (
      map[stairsY][stairsX] !== TILE_TYPES.FLOOR ||
      (stairsX === playerX && stairsY === playerY)
    );
    
    map[stairsY][stairsX] = isBossFloor ? TILE_TYPES.BOSS : TILE_TYPES.STAIRS_UP;
    
    this.placeEntities(map, floor, isBossFloor, playerX, playerY, stairsX, stairsY);
    
    const visited = this.createEmptyMap();
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        visited[y][x] = false;
      }
    }
    
    return {
      tiles: map,
      visited,
      width: this.width,
      height: this.height,
      playerX,
      playerY,
      stairsX,
      stairsY,
      floor,
      isBossFloor
    };
  }

  createEmptyMap() {
    const map = [];
    for (let y = 0; y < this.height; y++) {
      map[y] = [];
      for (let x = 0; x < this.width; x++) {
        map[y][x] = TILE_TYPES.WALL;
      }
    }
    return map;
  }

  carveRooms(map) {
    const rooms = [];
    const numRooms = 4 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numRooms; i++) {
      const roomWidth = 3 + Math.floor(Math.random() * 4);
      const roomHeight = 3 + Math.floor(Math.random() * 3);
      const roomX = 1 + Math.floor(Math.random() * (this.width - roomWidth - 2));
      const roomY = 1 + Math.floor(Math.random() * (this.height - roomHeight - 2));
      
      let overlaps = false;
      for (const room of rooms) {
        if (roomX < room.x + room.width + 1 && roomX + roomWidth + 1 > room.x &&
            roomY < room.y + room.height + 1 && roomY + roomHeight + 1 > room.y) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        rooms.push({ x: roomX, y: roomY, width: roomWidth, height: roomHeight });
        
        for (let y = roomY; y < roomY + roomHeight; y++) {
          for (let x = roomX; x < roomX + roomWidth; x++) {
            map[y][x] = TILE_TYPES.FLOOR;
          }
        }
      }
    }
    
    for (let i = 1; i < rooms.length; i++) {
      const room1 = rooms[i - 1];
      const room2 = rooms[i];
      
      const x1 = Math.floor(room1.x + room1.width / 2);
      const y1 = Math.floor(room1.y + room1.height / 2);
      const x2 = Math.floor(room2.x + room2.width / 2);
      const y2 = Math.floor(room2.y + room2.height / 2);
      
      if (Math.random() < 0.5) {
        this.carveHorizontalTunnel(map, x1, x2, y1);
        this.carveVerticalTunnel(map, y1, y2, x2);
      } else {
        this.carveVerticalTunnel(map, y1, y2, x1);
        this.carveHorizontalTunnel(map, x1, x2, y2);
      }
    }
  }

  carveHorizontalTunnel(map, x1, x2, y) {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x++) {
      if (y > 0 && y < this.height - 1 && x > 0 && x < this.width - 1) {
        map[y][x] = TILE_TYPES.FLOOR;
      }
    }
  }

  carveVerticalTunnel(map, y1, y2, x) {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y++) {
      if (x > 0 && x < this.width - 1 && y > 0 && y < this.height - 1) {
        map[y][x] = TILE_TYPES.FLOOR;
      }
    }
  }

  placeEntities(map, floor, isBossFloor, playerX, playerY, stairsX, stairsY) {
    const floorTiles = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (map[y][x] === TILE_TYPES.FLOOR &&
            !(x === playerX && y === playerY) &&
            !(x === stairsX && y === stairsY)) {
          floorTiles.push({ x, y });
        }
      }
    }
    
    this.shuffle(floorTiles);
    
    let monsterCount = isBossFloor ? 2 : 3 + Math.floor(floor / 3);
    let eventCount = 2 + Math.floor(Math.random() * 2);
    let idx = 0;
    
    for (let i = 0; i < monsterCount && idx < floorTiles.length; i++, idx++) {
      const { x, y } = floorTiles[idx];
      map[y][x] = TILE_TYPES.MONSTER;
    }
    
    for (let i = 0; i < eventCount && idx < floorTiles.length; i++, idx++) {
      const { x, y } = floorTiles[idx];
      map[y][x] = TILE_TYPES.EVENT;
    }
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

function generateEvent(floor) {
  const roll = Math.random();
  
  if (roll < 0.25) {
    return {
      type: 'trap',
      data: TRAP_TYPES[Math.floor(Math.random() * TRAP_TYPES.length)],
      emoji: '⚠️'
    };
  } else if (roll < 0.5) {
    const goldAmount = Math.floor(20 + Math.random() * 30 + floor * 5);
    const hasEquipment = Math.random() < 0.4;
    return {
      type: 'chest',
      data: {
        gold: goldAmount,
        equipment: hasEquipment ? null : null,
        hasEquipment
      },
      emoji: '📦'
    };
  } else if (roll < 0.7) {
    const items = [];
    const numItems = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...MERCHANT_ITEMS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numItems; i++) {
      items.push({ ...shuffled[i], price: Math.floor(shuffled[i].price * (0.8 + Math.random() * 0.4)) });
    }
    return {
      type: 'merchant',
      data: { items },
      emoji: '🧙'
    };
  } else if (roll < 0.85) {
    const healAmount = Math.floor(20 + Math.random() * 30 + floor * 3);
    return {
      type: 'healing',
      data: { amount: healAmount },
      emoji: '💚'
    };
  } else if (roll < 0.95) {
    const buffs = [
      { stat: 'attack', value: 2 + Math.floor(floor / 5), duration: 5 },
      { stat: 'defense', value: 2 + Math.floor(floor / 5), duration: 5 },
      { stat: 'maxHp', value: 10 + Math.floor(floor * 2), duration: 0 }
    ];
    return {
      type: 'buff',
      data: buffs[Math.floor(Math.random() * buffs.length)],
      emoji: '✨'
    };
  } else {
    return {
      type: 'nothing',
      data: { message: '这里什么也没有...' },
      emoji: '❓'
    };
  }
}

function canMove(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  const tile = map.tiles[y][x];
  return tile !== TILE_TYPES.WALL;
}

function movePlayer(map, dx, dy) {
  const newX = map.playerX + dx;
  const newY = map.playerY + dy;
  
  if (!canMove(map, newX, newY)) {
    return { moved: false, tile: null };
  }
  
  const tile = map.tiles[newY][newX];
  
  map.visited[map.playerY][map.playerX] = true;
  map.playerX = newX;
  map.playerY = newY;
  map.visited[newY][newX] = true;
  
  return { moved: true, tile };
}

function clearTile(map, x, y) {
  map.tiles[y][x] = TILE_TYPES.FLOOR;
}

function getVisibleTiles(map, viewRadius = 3) {
  const visible = [];
  for (let dy = -viewRadius; dy <= viewRadius; dy++) {
    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      const x = map.playerX + dx;
      const y = map.playerY + dy;
      if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= viewRadius) {
          visible.push({ x, y, distance });
        }
      }
    }
  }
  return visible;
}

module.exports = {
  TILE_TYPES,
  EVENT_TYPES,
  TRAP_TYPES,
  MERCHANT_ITEMS,
  MapGenerator,
  generateEvent,
  canMove,
  movePlayer,
  clearTile,
  getVisibleTiles
};
