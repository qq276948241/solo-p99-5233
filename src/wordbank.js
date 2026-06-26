const wordBank = {
  combo: [
    "看招！",
    "受死！",
    "接招！",
    "找死！",
    "出招！",
    "纳命！",
    "哼！",
    "哈！",
    "杀！",
    "斩！",
    "破！",
    "灭！",
    "杀无赦！",
    "接我一击！",
    "吃我一剑！",
    "给我倒下！",
    "你完了！",
    "去死吧！",
    "别挣扎！",
    "认命吧！",
    "嘿嘿嘿！",
    "哈哈哈！",
    "休想逃！",
    "跪下！",
    "臣服！"
  ],
  easy: [
    "你敢应战吗？",
    "看我一剑！",
    "懦夫！站住！",
    "受死吧！",
    "拿命来！",
    "哪里跑！",
    "吃我一击！",
    "快投降吧！",
    "你死定了！",
    "哈哈哈哈！",
    "过来受死！",
    "小子找死！",
    "尝尝这个！",
    "看招！",
    "出招吧！"
  ],
  medium: [
    "你这懦夫敢不敢接我一招！",
    "今天就让你见识一下我的厉害！",
    "天堂有路你不走地狱无门你闯进来！",
    "我要把你碎尸万段挫骨扬灰！",
    "别以为有几分本事就可以猖狂！",
    "你的死期到了还不快快受死！",
    "让你知道什么叫做真正的恐惧！",
    "我会让你后悔来到这个世界上！",
    "没有人能从我的手下活着离开！",
    "今天就是你的葬身之地！",
    "你以为你能打得过我吗可笑！",
    "我要把你的骨头一根根拆下来！",
    "准备好迎接死亡的降临了吗！",
    "弱者就该有弱者的觉悟和样子！",
    "你的生命将在这里画上句号！"
  ],
  hard: [
    "在绝对的力量面前任何的技巧都是苍白无力的挣扎罢了！",
    "你以为凭你那三脚猫的功夫就能战胜我简直是天大的笑话！",
    "我已经很久没有遇到敢主动向我挑衅的人了你确实很有勇气！",
    "能够死在我的手上也算是你这一辈子修来的福气了吧！",
    "从你踏入这个地牢的那一刻起你的命运就已经被注定了！",
    "你永远无法想象在黑暗之中潜伏着怎样恐怖的存在！",
    "每一个来到这里的冒险者都以为自己是那个例外的天选之子！",
    "真正的绝望不是死亡而是在死亡来临前的那漫长等待！",
    "我会让你亲身体验一下什么叫做求生不得求死不能！",
    "在这个世界上只有强者才有资格生存下去弱者只会被淘汰！",
    "你所做的一切努力在我看来都只不过是临死前的无谓挣扎！",
    "当你凝视深渊的时候深渊也在凝视着你而你却一无所知！",
    "历史都是由胜利者书写的而你将成为我故事里的背景板！",
    "所谓的正义和邪恶只不过是弱者为自己的懦弱找的借口！",
    "你现在跪下求饶的话我说不定还可以考虑给你一个痛快！"
  ],
  boss: [
    "卑微的蝼蚁你也配站在我的面前让我来告诉你什么叫做真正的绝望吧！",
    "在无尽的黑暗中沉睡了千年今天终于有人来唤醒我了那就用你的血来祭奠吧！",
    "我是这片地牢的主人是所有冒险者的噩梦是你永远无法战胜的恐惧化身！",
    "你以为爬上了这第十层就算是胜利了吗这仅仅只是你噩梦开始的地方而已！",
    "曾经有无数像你这样自以为是的冒险者倒在了我的脚下而你也不会成为例外！",
    "感受一下吧这股来自深渊的力量它会让你明白生与死之间的界限其实非常模糊！",
    "你的每一次呼吸每一次心跳甚至你此刻心中的恐惧都在我的掌控之中！",
    "我会把你的灵魂抽出来囚禁在永恒的黑暗之中让你受尽折磨永远不得超生！"
  ]
};

const noiseChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";

function addNoise(text, noiseLevel = 0.15) {
  const chars = text.split('');
  const noiseCount = Math.floor(chars.length * noiseLevel);
  
  for (let i = 0; i < noiseCount; i++) {
    const pos = Math.floor(Math.random() * chars.length);
    const noise = noiseChars[Math.floor(Math.random() * noiseChars.length)];
    chars.splice(pos, 0, noise);
  }
  
  return chars.join('');
}

function getPhrase(difficulty, isBoss = false, addNoiseFlag = false, comboActive = false) {
  let pool;
  
  if (comboActive && !isBoss) {
    pool = wordBank.combo;
  } else if (isBoss) {
    pool = wordBank.boss;
  } else {
    switch (difficulty) {
      case 1:
      case 2:
      case 3:
        pool = wordBank.easy;
        break;
      case 4:
      case 5:
      case 6:
        pool = [...wordBank.easy, ...wordBank.medium];
        break;
      case 7:
      case 8:
      case 9:
      default:
        pool = [...wordBank.medium, ...wordBank.hard];
        break;
    }
  }
  
  let phrase = pool[Math.floor(Math.random() * pool.length)];
  
  if (addNoiseFlag && !comboActive) {
    phrase = addNoise(phrase, 0.1 + Math.random() * 0.15);
  }
  
  return phrase;
}

function calculateTimeLimit(phrase, baseTime = 0.3, minTime = 3, comboActive = false) {
  if (comboActive) {
    baseTime = 0.2;
    minTime = 1.5;
  }
  return Math.max(minTime, phrase.length * baseTime);
}

module.exports = {
  getPhrase,
  calculateTimeLimit,
  addNoise
};
