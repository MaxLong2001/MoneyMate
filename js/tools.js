/**
 * MoneyMate 钱搭子 — Tool Functions
 * Budget calculator, savings planner, risk checker.
 */
const Tools = (() => {

  // ─── Budget Calculator (§6 of dev docs) ───────────────────────────

  /**
   * Calculate budget plan from income, expenses, and saving target.
   */
  function calculateBudget({ monthlyIncome, fixedExpense = 0, specialExpense = 0, savingTarget = 0 }) {
    const availableSpending = monthlyIncome - fixedExpense - savingTarget - specialExpense;
    const weeklyBudget = Math.round(availableSpending / 4 * 100) / 100;
    const dailyReference = Math.round(availableSpending / 30 * 100) / 100;
    const savingRatio = monthlyIncome > 0 ? savingTarget / monthlyIncome : 0;

    let budgetStatus;
    if (availableSpending < 0) {
      budgetStatus = 'infeasible';
    } else if (savingRatio > 0.35) {
      budgetStatus = 'high_pressure';
    } else if (savingRatio >= 0.10) {
      budgetStatus = 'healthy';
    } else {
      budgetStatus = 'low_saving';
    }

    const status = CONFIG.BUDGET_STATUS[budgetStatus];

    // Generate category budget suggestions
    const categoryBudget = {
      food: Math.round(availableSpending * 0.45),
      transport: Math.round(availableSpending * 0.08),
      communication: Math.round(availableSpending * 0.05),
      study: Math.round(availableSpending * 0.10),
      entertainment: Math.round(availableSpending * 0.18),
      flexible: Math.round(availableSpending * 0.14),
    };

    // Generate consumption advice
    let advice = '';
    if (budgetStatus === 'infeasible') {
      const gap = Math.abs(availableSpending);
      advice = `当前方案不可行：月收入 ¥${monthlyIncome} 无法覆盖 ¥${fixedExpense + savingTarget + specialExpense} 的支出+储蓄。建议：① 把储蓄目标从 ¥${savingTarget} 降到 ¥${Math.max(0, savingTarget - gap)}；② 或者延长攒钱周期，把压力分摊到更多月份。`;
    } else if (budgetStatus === 'high_pressure') {
      advice = `储蓄占比 ${Math.round(savingRatio * 100)}%，属于较高水平。建议每周消费控制在 ¥${weeklyBudget} 左右，需要比较强的自律。如果觉得压力大，可以考虑轻松版：储蓄 ¥${Math.round(savingTarget * 0.75)}，周预算可提升到 ¥${Math.round((availableSpending + savingTarget * 0.25) / 4)}。`;
    } else if (budgetStatus === 'healthy') {
      advice = `预算整体健康，每周 ¥${weeklyBudget} 可自由支配。奶茶不是不能喝，建议每周控制在2–3次，外卖建议每周控制在3次以内，这样基本不影响储蓄目标。`;
    } else {
      advice = `目前储蓄比例偏低（${Math.round(savingRatio * 100)}%），建议至少将月收入的10%（约 ¥${Math.round(monthlyIncome * 0.10)}）作为基础应急金，以应对意外支出。`;
    }

    return {
      monthlyIncome,
      fixedExpense,
      specialExpense,
      savingTarget,
      availableSpending,
      weeklyBudget,
      dailyReference,
      savingRatio: Math.round(savingRatio * 100),
      budgetStatus,
      statusLabel: status.label,
      statusDesc: status.desc,
      statusClass: status.cls,
      categoryBudget,
      advice,
    };
  }

  // ─── Savings Plan Generator (§7 of dev docs) ──────────────────────

  /**
   * Create a savings plan with three tiers.
   */
  function createSavingPlan({ targetAmount, currentAmount = 0, deadlineWeeks }) {
    const remainingAmount = targetAmount - currentAmount;

    if (remainingAmount <= 0) {
      return {
        remainingAmount: 0,
        weeklyRequired: 0,
        message: `🎉 你已经存够 ¥${targetAmount} 了！目标已达成，可以设置新目标啦～`,
        plans: null,
      };
    }

    const weeklyRequired = Math.round(remainingAmount / deadlineWeeks * 100) / 100;
    const monthlyRequired = Math.round(weeklyRequired * 4 * 100) / 100;

    const plans = {
      easy: {
        weeklySaving: Math.round(weeklyRequired * 0.75 * 100) / 100,
        estimatedWeeks: Math.ceil(deadlineWeeks / 0.75),
        label: '轻松版 🌱',
        description: '不想明显降低生活质量',
        detail: `每周存 ¥${Math.round(weeklyRequired * 0.75)}，预计 ${Math.ceil(deadlineWeeks / 0.75)} 周完成。生活压力较小，但目标会延期。`,
      },
      standard: {
        weeklySaving: weeklyRequired,
        estimatedWeeks: deadlineWeeks,
        label: '标准版 ⭐',
        description: '按原计划完成',
        detail: `每周存 ¥${weeklyRequired}，按原计划 ${deadlineWeeks} 周完成。适合稳定执行的同学。`,
      },
      sprint: {
        weeklySaving: Math.round(weeklyRequired * 1.25 * 100) / 100,
        estimatedWeeks: Math.max(1, Math.ceil(deadlineWeeks / 1.25)),
        label: '冲刺版 🚀',
        description: '更快完成',
        detail: `每周存 ¥${Math.round(weeklyRequired * 1.25)}，预计 ${Math.max(1, Math.ceil(deadlineWeeks / 1.25))} 周完成。需要减少娱乐消费，比较有挑战。`,
      },
    };

    // Check if any plan is too aggressive
    const warnings = [];
    if (monthlyRequired > 500) {
      warnings.push('每月需要存 ' + monthlyRequired + ' 元，对于普通学生来说压力较大，建议延长周期。');

    }

    return {
      targetAmount,
      currentAmount,
      remainingAmount,
      weeklyRequired,
      monthlyRequired,
      plans,
      warnings,
    };
  }

  // ─── Investment Risk Checker (§8 of dev docs) ─────────────────────

  /**
   * Evaluate risk based on three answers.
   */
  function checkInvestmentRisk({ assetType, needWithin3Months, canAcceptLoss, understandProduct }) {
    let riskLevel, conclusion, educationPoints;

    if (needWithin3Months === true || needWithin3Months === 'yes') {
      riskLevel = 'high';
      conclusion = '不建议将未来3个月需要使用的钱投入高波动资产。短期要用的钱应优先保证流动性和安全性。';
      educationPoints = [
        '短期要用的钱（生活费、学费、考试费等）应当放在随时可取、保本的地方。',
        '高波动资产（股票、基金等）短期内可能下跌10%–30%，不适合存放短期必须支出。',
        '不要因为同学推荐或近期上涨就跟风购买——投资时机和产品选择需要更多学习。',
      ];
    } else if (canAcceptLoss === false || canAcceptLoss === 'no') {
      riskLevel = 'high';
      conclusion = '你目前的风险承受能力可能不足。如果短期亏损会影响正常生活，建议先以学习和模拟为主。';
      educationPoints = [
        '任何投资都有亏损可能，即使是"低风险"产品也可能短期下跌。',
        '建议先用模拟交易或小额定投（比如每月¥50–¥100）体验市场波动。',
        '建立至少3个月生活费的应急金后，再考虑用闲钱投资。',
      ];
    } else if (understandProduct === false || understandProduct === 'no') {
      riskLevel = 'medium';
      conclusion = '建议先充分了解该产品的机制、风险和费用，不要因为别人推荐就跟风购买。';
      educationPoints = [
        '了解"它为什么会涨"和"它为什么会跌"同样重要。',
        '关注产品的管理费用、赎回费用和持有期限，这些直接影响实际收益。',
        '可以从低门槛的指数基金科普开始，逐步建立自己的投资知识体系。',
      ];
    } else {
      riskLevel = 'low';
      conclusion = '你对风险和产品有基本认知，且这笔钱不影响短期生活。可以继续学习，但本工具不提供具体买卖建议。';
      educationPoints = [
        '投资前建议做好资产配置，不要把所有钱投入单一资产。',
        '定期复盘自己的投资决策，记录买入和卖出的原因。',
        '持续学习金融知识，建立自己的投资框架，而不是依赖他人推荐。',
      ];
    }

    return {
      assetType,
      riskLevel,
      conclusion,
      educationPoints,
    };
  }

  // ─── Public API ───────────────────────────────────────────────────

  return { calculateBudget, createSavingPlan, checkInvestmentRisk };
})();

window.Tools = Tools;
