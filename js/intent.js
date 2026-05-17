/**
 * MoneyMate 钱搭子 — Intent Classifier
 * Rule-based intent recognition with entity extraction (§4 of dev docs).
 */
const IntentClassifier = (() => {

  // ─── Chinese numeral conversion ──────────────────────────────────

  const CN_NUM = { '零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'半':0.5 };
  const CN_MULT = { '十':10,'百':100,'千':1000,'万':10000 };

  function parseChineseNumber(s) {
    let result = 0;
    let current = 0;
    for (const ch of s) {
      if (CN_NUM[ch] !== undefined) {
        current = CN_NUM[ch];
      } else if (CN_MULT[ch] !== undefined) {
        if (current === 0) current = 1;
        current *= CN_MULT[ch];
        result += current;
        current = 0;
      } else {
        if (current > 0) { result += current; current = 0; }
        const n = parseInt(ch);
        if (!isNaN(n)) { result = result * 10 + n; }
      }
    }
    result += current;
    return result > 0 ? result : null;
  }

  function extractNumber(text) {
    // Try Arabic numerals first
    const m = text.match(/(\d+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
    // Try Chinese numerals
    const cnMatch = text.match(/[零一二两三四五六七八九十百千万]+/);
    if (cnMatch) return parseChineseNumber(cnMatch[0]);
    return null;
  }

  // ─── Main Classifier ─────────────────────────────────────────────

  function classify(message) {
    const text = message.toLowerCase().trim();
    const scores = {};
    const entities = extractEntities(message);

    for (const [intent, keywords] of Object.entries(CONFIG.INTENT_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) {
          score += kw.length >= 3 ? 2 : 1;
        }
      }
      scores[intent] = score;
    }

    let primaryIntent = 'UNKNOWN';
    let maxScore = 0;
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) { maxScore = score; primaryIntent = intent; }
    }

    // Boost investment check if asset type mentioned
    if (entities.assetType && primaryIntent !== 'INVESTMENT_RISK_CHECK') {
      primaryIntent = 'INVESTMENT_RISK_CHECK';
      maxScore = Math.max(maxScore, 3);
    }

    // Infer from entities if no keyword match
    if (maxScore === 0) {
      if (entities.monthlyIncome && entities.monthlyIncome > 0) {
        primaryIntent = 'BUDGET_PLAN'; maxScore = 1;
      } else if (entities.targetAmount && entities.targetAmount > 0) {
        primaryIntent = 'SAVING_GOAL'; maxScore = 1;
      }
    }

    return { intent: primaryIntent, confidence: Math.min(maxScore / 5, 1), scores, entities };
  }

  // ─── Entity Extraction ────────────────────────────────────────────

  function extractEntities(text) {
    const entities = {};

    // --- Asset type ---
    const assetM = text.match(/(基金|股票|理财|币|比特币|以太坊|黄金|外汇|期货|债券|存款|保险)/);
    if (assetM) entities.assetType = assetM[1];

    // --- Monthly income ---
    const incomePatterns = [
      /生活费\s*[:：]?\s*(\d+)/,
      /(?:每月|这个月|月)\S{0,4}(?:生活费|收入)\S{0,2}(\d+)/,
      /(\d+)\S{0,2}(?:生活费|收入)/,
      /生活费\S{0,2}(\d+)/,
    ];
    for (const p of incomePatterns) {
      const m = text.match(p);
      if (m) { entities.monthlyIncome = parseInt(m[1]); break; }
    }

    // --- Saving target ---
    const savingPatterns = [
      /(?:想|要|打算|计划)\s*(?:存|攒)\s*(\d+)/,
      /(?:存|攒)\s*(\d+)/,
      /储蓄\s*[:：]?\s*(\d+)/,
      /(?:目标|储蓄)(?:金额)?\s*[:：]?\s*(\d+)/,
    ];
    for (const p of savingPatterns) {
      const m = text.match(p);
      if (m) { entities.savingTarget = parseInt(m[1]); break; }
    }

    // --- Target amount + goal name ---
    // "想三个月攒1500元买耳机" → targetAmount=1500, goalName="耳机"
    // Extract amount first
    const amountM = text.match(/(?:攒|存)\s*(\d+)\s*(?:元|块)?/);
    if (amountM) {
      entities.targetAmount = parseInt(amountM[1]);
      // Extract goal name after 元/块 买/用于
      const after = text.substring(amountM.index + amountM[0].length);
      const goalM = after.match(/(?:买|用于|准备|做)\s*([^\d，。,.\s]{1,10})/);
      if (goalM) {
        entities.goalName = goalM[1].trim();
      }
    }
    // Also try "买X要Y元", "想买X"
    if (!entities.targetAmount) {
      const buyM = text.match(/(?:想买|要买|买)\s*(.{1,8}?)\s*(?:要|需要|得)\s*(\d+)/);
      if (buyM) {
        entities.goalName = buyM[1].trim();
        entities.targetAmount = parseInt(buyM[2]);
      }
    }

    // --- Fixed expense ---
    const fixedM = text.match(/固定(?:\s*支出)?\s*[:：]?\s*(\d+)/);
    if (fixedM) entities.fixedExpense = parseInt(fixedM[1]);

    // --- Current amount ---
    const currentM = text.match(/(?:已经|已|目前|现在).{0,4}(?:存|攒|有)\S{0,2}(\d+)/);
    if (currentM) entities.currentAmount = parseInt(currentM[1]);
    if (entities.currentAmount === undefined) {
      const cm2 = text.match(/(?:存了|攒了|已有)\s*(\d+)/);
      if (cm2) entities.currentAmount = parseInt(cm2[1]);
    }

    // --- Time/deadline (Arabic + Chinese numerals) ---
    // Arabic: "3个月", "12周", "30天"
    const timePatterns = [
      { pattern: /(\d+)\s*(?:个?\s*月|个月)/, multiplier: 4 },
      { pattern: /(\d+)\s*(?:周|星期)/, multiplier: 1 },
      { pattern: /(\d+)\s*(?:天|日)/, multiplier: 1/7 },
    ];
    for (const { pattern, multiplier } of timePatterns) {
      const m = text.match(pattern);
      if (m) {
        entities.deadlineWeeks = Math.round(parseInt(m[1]) * multiplier);
        break;
      }
    }
    // Chinese: "三个月", "两周", "十二周"
    if (!entities.deadlineWeeks) {
      const cnTimeM = text.match(/([零一二两三四五六七八九十百千万]+)\s*(?:个?\s*月|个月)/);
      if (cnTimeM) {
        const n = parseChineseNumber(cnTimeM[1]);
        if (n) entities.deadlineWeeks = n * 4;
      }
      if (!entities.deadlineWeeks) {
        const cnWeekM = text.match(/([零一二两三四五六七八九十百千万]+)\s*(?:周|星期)/);
        if (cnWeekM) {
          const n = parseChineseNumber(cnWeekM[1]);
          if (n) entities.deadlineWeeks = n;
        }
      }
    }

    // --- Special expense ---
    const specialM = text.match(/特殊(?:\s*支出)?\s*[:：]?\s*(\d+)/);
    if (specialM) entities.specialExpense = parseInt(specialM[1]);

    return entities;
  }

  return { classify, extractEntities, parseChineseNumber, extractNumber };
})();

window.IntentClassifier = IntentClassifier;
