# 打字地牢 架构文档

## 启动流程

一切从 [index.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/index.js) 开始。它干三件事：清屏、new Game()、game.start()。就这么简单，之后控制权就交给 game.js 了。

## game.js —— 调度中心

[src/game.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/game.js) 是整个游戏的总调度，它握着所有子系统的实例：

- `this.player` — 玩家数据（Player 实例）
- `this.ui` — 终端渲染（UIRenderer 实例）
- `this.battle` — 战斗系统（BattleSystem 实例）
- `this.save` — 存档系统（SaveSystem 实例）
- `this.mapGen` — 地图生成器（MapGenerator 实例）
- `this.map` — 当前楼层的地图数据

game.js 用一个 `gameState` 字符串来做有限状态机，可能的值有：`title`、`menu`、`playing`、`battle`、`event`、`loot`、`merchant`、`equip`、`gameover`、`victory`。每次按键进来都走 `handleKeyPress`，根据当前 state 分发到不同的处理函数。

它还负责管理输入源——用 keypress 库监听方向键和快捷键做地图移动，但进入战斗或商店时要临时移除 keypress 监听器（否则跟 readline 的 line 事件打架），出来后再重新挂上。这块是当初踩过的坑。

## 模块依赖关系

```
index.js
  └── game.js
        ├── player.js （玩家数据）
        ├── ui.js （终端渲染 + ANSI特效函数）
        ├── battle.js （战斗流程编排）
        │     ├── inputHandler.js （readline输入收集+超时）
        │     ├── combo.js （连击状态+伤害计算+安慰提示）
        │     └── wordbank.js （词库+时限计算）
        ├── save.js （JSON文件存档）
        ├── map.js （地图生成+移动+事件触发）
        ├── monsters.js （怪物模板+按楼层生成）
        └── equipment.js （装备模板+稀有度+对比+掉落）
```

所有模块都是 CommonJS（require/module.exports），没用 ESM。chalk 用的是 v4 因为 v5 开始是 ESM-only。

## battle.js —— 打字战斗核心循环

[src/battle.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/battle.js) 只管战斗流程编排和胜负判定，具体算伤害、收输入、渲染特效全委托出去。

### 单回合流程

1. **选词**：调 wordbank.js 的 `getPhrase()` 根据楼层难度和是否连击状态选一句短语
2. **算时限**：调 wordbank.js 的 `calculateTimeLimit()`，连击模式时限更短
3. **收输入**：调 inputHandler.js 的 `collectInput(phrase, timeLimit)`，返回 `{ success, timeout, input, timeUsed }`
4. **判定分支**：
   - success=true → 看是不是完美格挡（timeUsed/timeLimit < 0.5），完美则 `incrementCombo`，非完美则 `breakCombo`
   - timeout=true → `breakCombo` + 受怪攻击
   - 输入错误 → `breakCombo` + 受怪攻击
5. **算伤害**：combo.js 的 `calculatePlayerDamage()` / `calculateMonsterDamage()`
6. **记日志**：根据分支结果调 `logPerfectBlock` / `logNormalBlock` / `logTimeout` / `logTypo`
7. 循环直到怪物死或玩家死

### 伤害公式

```
玩家伤害 = max(1, floor(攻击力 × 速度加成 × 连击倍率) - 怪物防御)
速度加成 = max(0.5, 2 - timeRatio × 1.5)
连击倍率 = 1.0 / 1.1(1次) / 1.3(2次) / 2.0(3次激活)

怪物伤害 = 怪物攻击力 × attackBonus（仅BOSS有，普通怪直接用攻击力）
玩家实际受伤 = max(1, 怪物伤害 - 玩家防御)
```

### 连击系统详细规则

连击状态全部在 combo.js 里管理，player.js 只存 `comboCount` 和 `comboActive` 两个字段：

- 连续 **3次完美格挡** → `comboActive = true`，伤害倍率变 2.0
- 累积过程中也有小加成：1次→1.1x，2次→1.3x
- **任何非完美格挡**（包括普通格挡成功、超时、输错）→ `breakCombo`，comboCount 归零
- 连击激活时词库切换到 combo 词池（2-5字短句），时限缩短（baseTime=0.2, minTime=1.5）
- 连击中断时会给安慰提示，区分"是从激活状态断的"和"只是累积中断"

## inputHandler.js —— 输入收集与超时

[src/inputHandler.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/inputHandler.js) 封装了 readline + setTimeout 的超时逻辑：

- `collectInput(expected, timeoutSeconds)` 返回 Promise
- 用 `this.timeoutId` 存 setTimeout 的 ID，每次新调用前先 `clearTimeout` 再设新的（之前有个 bug 是 timeoutId 是局部变量，快速连续调用时旧回调跑过来把新连击数清零了）
- 用 `this.resolved` 标志位保证 Promise 只 resolve 一次（line 事件和 close 事件可能同时触发）
- 超时判定用时间戳比较 `timeUsed > timeoutSeconds`，而不是布尔 flag（之前用 flag 有边界条件 bug：刚好踩线的瞬间可能同时被判成功和超时）

## wordbank.js —— 词库与难度

[src/wordbank.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/wordbank.js) 有五个词池：

| 词池 | 长度 | 什么时候用 |
|------|------|-----------|
| combo | 2-5字 | 连击激活时（非BOSS） |
| easy | ~5字 | 1-3楼 |
| medium | ~15字 | 4-6楼混入easy，7楼以上混入hard |
| hard | ~25字 | 7楼以上跟medium混着出 |
| boss | ~35字 | BOSS战专用 |

**楼层→难度映射**：1-3楼只用 easy，4-6楼 easy+medium 混池，7楼以上 medium+hard 混池。BOSS 战强制用 boss 词池（连击也不换）。

**时限公式**：`max(minTime, phrase.length × baseTime)`。普通模式 baseTime=0.3秒/字、minTime=3秒；连击模式 baseTime=0.2、minTime=1.5；BOSS 模式在 battle.js 里单独算 `max(5, phrase.length × 0.35)`。

**噪声字符**：BOSS 的 `hasNoise=true` 时，给短语随机插入 10-25% 的标点符号干扰字符，玩家输入时需要忽略这些噪声（目前实现是原样输入不含噪声的原文即可）。

## monsters.js —— 怪物生成

[src/monsters.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/monsters.js) 有 9 种普通怪 + 5 种 BOSS：

- 普通怪各有 `minFloor` / `maxFloor`，`spawnMonster(floor)` 筛出当前楼层可选的怪随机选一种
- 属性按楼层缩放：`floorMultiplier = 1 + (floor - 1) × 0.1`，基础属性乘以这个系数后取整
- BOSS 固定在第 10/20/30/40/50 层，属性不缩放（用 baseXxx 原值），但有 `attackBonus` 乘数让伤害更高
- BOSS 还有 `hasNoise=true` 标记，告诉 wordbank.js 要往短语里插干扰字符

装备不影响怪物生成——怪物属性纯粹由模板+楼层系数决定。装备只影响玩家的攻击力和防御力，间接影响战斗结果。

## equipment.js —— 装备系统

[src/equipment.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/equipment.js) 管理三个槽位（weapon/armor/accessory）× 8 个梯度 × 5 个稀有度：

**稀有度与掉率**：普通 50%、优秀 30%、稀有 15%、史诗 4%、传说 1%。楼层越高运气加成越多（每层 +1%，上限 +20%），分摊到各稀有度上。

**装备生成流程**：
1. 随机选槽位（或 forceSlot 指定）
2. `rollRarity(floor)` 掷骰定稀有度
3. 从该槽位+稀有度的候选里随机选一件（floor 要 ≥ minFloor）
4. 候选为空则降级到任意稀有度兜底

**BOSS 掉落**：`generateBossDrop()` 一次掉 2-3 件，稀有度强制为 rare/epic/legendary 之一。

**装备对比**：`compareEquipment()` 用一个加权总分（攻击+防御+生命/5+吸血×100）判断新旧优劣，并逐项列出属性差值。

**装备影响玩家属性**：player.js 的 `recalculateStats()` 调用 `calculateEquipmentStats(equipment)` 把三个槽位的攻击/防御/生命/吸血加到基础属性上。

## map.js —— 地图生成

[src/map.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/map.js) 用的是经典的 Roguelike "挖房间+连走廊"算法：

1. 初始化 14×10 的全墙地图
2. 随机挖 4-7 个不重叠的矩形房间（3-6宽 × 3-5高）
3. 按房间顺序，相邻两个房间的中心点之间挖 L 形走廊（先横后竖或先竖后横，随机选）
4. 随机放玩家起点和楼梯/BOSS位置（保证不在同一个格子）
5. 在剩余空地上放怪物和事件

**怪物数量**：普通层 `3 + floor/3`（取整），BOSS 层只放 2 个。事件数量固定 2-3 个。

**事件类型**（踩到 `?` 格子触发）：陷阱 25%、宝箱 25%、商人 20%、治疗泉 15%、增益 10%、空事件 5%。每种事件的具体数值跟楼层相关（伤害/金币/治疗量随楼层递增）。

**迷雾系统**：地图维护一个 `visited` 二维数组，玩家视野半径 4 格。没访问过的区域显示 `░`，访问过但不在视野内的格子变暗（chalk.gray），视野内的格子正常着色。

## save.js —— 存档系统

[src/save.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/save.js) 存到项目根目录的 `saves/game_save.json`，格式：

```json
{
  "version": "1.0.0",
  "savedAt": "ISO时间戳",
  "player": { 玩家全部序列化数据 },
  "map": { tiles, visited, 宽高, 玩家坐标, 楼梯坐标, 楼层号 },
  "highestFloor": 42
}
```

玩家数据通过 player.js 的 `toJSON()` / `fromJSON()` 做序列化和反序列化。地图数据直接存原始二维数组。每次上楼梯自动存档（`autoSave`），也可手动按 S 键存。

注意：`fromJSON()` 用的是 `Object.assign(player, data)`，所以如果以后给 Player 加新字段，老存档加载时这些字段会是 undefined，需要手动做迁移或给默认值。

## ui.js —— 终端渲染

[src/ui.js](file:///d:/code/ai-prompt/solo-chrome-dev-F12/repos/repo99/project99/src/ui.js) 负责所有终端输出，不碰任何游戏逻辑。核心功能：

- **12个特效函数**：`flashText`（闪烁黄底黑字）、`shakeText`（红色粗体）、`comboActiveText`（黄色粗体）、`comfortText`（青色+💬前缀）等。battle.js 通过 `this.ui?.flashText(...)` 调用，ui 不存在时 fallback 到裸 chalk。
- **状态栏**：HP条+EXP条+楼层+等级+金币+连击状态+装备信息，连击激活时整个状态栏变黄底
- **地图渲染**：带边框+迷雾+图例，视野内的格子正常着色
- **战斗日志**：根据关键词自动上色（连击→闪烁，完美格挡→黄色，受伤→红色等）
- **各种画面**：标题画面（ASCII art）、Game Over、胜利、帮助、装备对比、商人、事件结果

所有输出都是 `this.stdout.write()` 拼字符串，不用 console.log。清屏用的是 `\x1Bc` 转义码。

---

## 架构凑合的地方 & 以后改动的 TODO

### 1. game.js 太胖了

game.js 同时负责：状态机路由、按键处理、地图移动、事件触发、商店交互、装备流程、渲染调度。700 行了，以后再加功能（技能系统、宠物、成就等）会继续膨胀。

**改法**：把每种 gameState 的逻辑抽成独立的状态处理器，比如 `states/playingState.js`、`states/battleState.js`、`states/merchantState.js`，game.js 只做状态切换和公共资源管理。参考 State Pattern。

### 2. 输入管理散乱

现在 game.js 用 keypress 做地图移动、用 readline 做商店交互，battle.js 用 inputHandler 做战斗输入，三套输入机制各自为政。切换时还要手动 removeListener / addListener，容易忘。

**改法**：统一做一个 InputManager，内部管理 keypress 和 readline 的切换，对外只暴露 `onDirection(callback)`、`onAction(callback)`、`collectLine(prompt)` 之类的接口。这样加新输入方式（比如手柄支持）只改 InputManager 一个文件。

### 3. 事件系统是硬编码

map.js 的 `generateEvent()` 里 6 种事件类型用 if-else 堆叠，game.js 的 `triggerEvent()` 又用 switch-case 再写一遍对应逻辑。新增事件类型要改两个文件。

**改法**：做一个事件注册表，每种事件是一个对象 `{ type, emoji, generate(floor), execute(game) }`，map.js 只管生成，game.js 调 `event.execute(this)` 执行。新事件只加一个文件。

### 4. 装备只影响数值，没有特殊效果

现在装备就是攻击/防御/生命/吸血四个数值，没有"攻击时有几率冰冻怪物"这种特效。装备模板是静态数据，没法扩展。

**改法**：给装备模板加 `effects` 数组字段，比如 `{ type: 'onHit', chance: 0.2, effect: 'freeze', duration: 2 }`，battle.js 的伤害计算流程里加一个 effect 触发点。

### 5. 怪物只有数值差异，没有特殊行为

9 种普通怪本质上就是攻击力/血量/出没楼层的不同，没有"幽灵会闪避"、"吸血鬼会回血"这种机制差异。

**改法**：给怪物加 `abilities` 数组和对应的 `onRoundStart` / `onTakeDamage` / `onAttack` 钩子函数，battle.js 每回合调用。

### 6. 存档没有版本迁移

`Player.fromJSON()` 用 `Object.assign`，新字段在老存档里是 undefined。目前没出问题是因为字段只会加不会删，但一旦改了字段名或结构就会炸。

**改法**：在 save.js 里加 `migrateSave(data)` 函数，根据 version 字段做增量迁移。每次改 Player 结构就加一个 migration case。

### 7. 战斗日志着色靠关键词匹配

ui.js 的 `drawBattleLog()` 用 `log.includes('连击达成')` 这种方式判断日志该用什么颜色，很脆弱——改个文案就可能着色失效。

**改法**：给日志条目加 `{ text, type }` 结构，type 可以是 `'flash'`、`'combo'`、`'damage'`、`'comfort'` 等，drawBattleLog 根据 type 着色，不依赖文本内容。

### 8. 没有测试覆盖

目前只有手动跑测试脚本来验证，没有正式的测试套件。combo.js 和 inputHandler.js 的 bug 就是靠手写测试脚本发现的。

**改法**：用 Jest 或 node:test 写单元测试，至少覆盖 combo.js 的伤害计算、inputHandler.js 的超时边界、wordbank.js 的词池选择逻辑。CI 跑一遍测试再合并。

### 9. 终端兼容性

`\x1b[5m`（闪烁）在 Windows Terminal 和 iTerm2 里有效，但在很多终端模拟器里不支持或只显示为反色。状态栏宽度硬编码 80 列，窄终端会换行乱掉。

**改法**：检测终端能力（`process.stdout.columns`、`process.stdout.getColorDepth()`），动态调整布局和降级特效。

---

> 最后更新：2026-06-26，反映 combo.js / inputHandler.js 重构和 setTimeout 竞态 bug 修复后的代码状态。
