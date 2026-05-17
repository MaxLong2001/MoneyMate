/**
 * MoneyMate 钱搭子 — Chat Controller
 * State machine, message routing, and response generation.
 */
const Chat = (() => {

  // ─── Conversation State ───────────────────────────────────────────

  const state = {
    context: 'idle',          // 'idle' | 'budget' | 'saving' | 'risk' | 'review'
    step: 0,
    collected: {},            // Accumulated user inputs
    riskAnswers: [],          // [q1_answer, q2_answer, q3_answer]
    history: [],              // Message history
  };

  function resetState() {
    state.context = 'idle';
    state.step = 0;
    state.collected = {};
    state.riskAnswers = [];
  }

  // ─── Message Handler ──────────────────────────────────────────────

  function handleUserMessage(message) {
    UI.renderUserMessage(message);

    const { intent, entities } = IntentClassifier.classify(message);

    // Merge extracted entities into collected
    Object.assign(state.collected, entities);
    state.history.push({ role: 'user', content: message, intent, entities });

    // Show typing indicator
    const typing = UI.renderTypingIndicator();

    // Route based on current context and intent
    setTimeout(() => {
      UI.removeTypingIndicator(typing);

      // Detect topic switch mid-flow
      const contextIntentMap = {
        budget: 'BUDGET_PLAN',
        saving: 'SAVING_GOAL',
        risk: 'INVESTMENT_RISK_CHECK',
        review: 'EXPENSE_REVIEW',
      };
      const currentExpectedIntent = contextIntentMap[state.context];
      const isContextSwitch = state.context !== 'idle' &&
        intent !== currentExpectedIntent &&
        intent !== 'UNKNOWN' &&
        intent !== 'SMALL_TALK';

      if (isContextSwitch) {
        // User switched topic — reset and start new flow
        resetState();
        startFlow(intent, message, entities);
        return;
      }

      if (state.context === 'budget') {
        handleBudgetFlow(message, intent, entities);
      } else if (state.context === 'saving') {
        handleSavingFlow(message, intent, entities);
      } else if (state.context === 'risk') {
        handleRiskFlow(message, intent, entities);
      } else if (state.context === 'review') {
        handleReviewFlow(message, intent, entities);
      } else {
        startFlow(intent, message, entities);
      }
    }, 800 + Math.random() * 600);
  }

  // ─── Flow Starters ────────────────────────────────────────────────

  function startFlow(intent, message, entities) {
    switch (intent) {
      case 'BUDGET_PLAN':
        startBudgetFlow(entities);
        break;
      case 'SAVING_GOAL':
        startSavingFlow(entities);
        break;
      case 'INVESTMENT_RISK_CHECK':
        startRiskFlow(entities);
        break;
      case 'FINANCIAL_KNOWLEDGE':
        handleKnowledgeQuery(entities);
        break;
      case 'EXPENSE_REVIEW':
        handleExpenseReview();
        break;
      case 'SMALL_TALK':
        handleSmallTalk(message);
        break;
      default:
        handleUnknown(message);
    }
  }

  // ─── Budget Flow ──────────────────────────────────────────────────

  function startBudgetFlow(entities) {
    resetState();
    state.context = 'budget';
    state.collected = entities;

    // Check what we already know
    const hasIncome = entities.monthlyIncome && entities.monthlyIncome > 0;
    const hasFixed = entities.fixedExpense !== undefined;
    const hasSaving = entities.savingTarget !== undefined;

    if (hasIncome && hasFixed && hasSaving) {
      // We have enough — compute immediately
      computeAndShowBudget();
      return;
    }

    if (hasIncome) {
      // Has income, ask for fixed expenses
      state.step = 2;
      UI.renderAgentMessage(
        `好的，月生活费 **¥${entities.monthlyIncome}** 收到～\n\n接下来需要你补充一下：\n📤 **每月的固定支出**大概多少？比如话费、网费、交通卡、订阅服务等。\n\n如果没有固定支出，直接说"没有"或"0"就行～`
      );
    } else {
      // Need income first
      state.step = 1;
      UI.renderAgentMessage(
        '没问题，我来帮你做预算规划！📋\n\n首先告诉我：\n📥 **你这个月的生活费（或月收入）是多少？**\n\n包括家里给的生活费、兼职收入、奖学金等，统统算上～'
      );
    }
  }

  function handleBudgetFlow(message, intent, entities) {
    Object.assign(state.collected, entities);

    const hasIncome = state.collected.monthlyIncome && state.collected.monthlyIncome > 0;
    const hasFixed = state.collected.fixedExpense !== undefined;
    const hasSaving = state.collected.savingTarget !== undefined;
    const hasSpecial = state.collected.specialExpense !== undefined;

    if (!hasIncome) {
      // Try to extract income from message
      const num = extractNumber(message);
      if (num && num >= 100) {
        state.collected.monthlyIncome = num;
      } else if (num && num < 100) {
        UI.renderAgentMessage('这个数字看起来不太像月收入哦～请告诉我你每月的生活费总额，比如"1500"或"2000元"。');
        return;
      } else {
        UI.renderAgentMessage('请告诉我一个具体数字哦～比如"1500元"或"生活费2000"。');
        return;
      }
    }

    if (!hasFixed && state.step <= 2) {
      const num = extractNumber(message);
      if (num !== null || /没有|无|0|没|否/.test(message)) {
        state.collected.fixedExpense = num || 0;
        state.step = 3;
      } else {
        UI.renderAgentMessage('大概多少呢？给个数字就行～比如话费+网费+交通卡每月"100元"。没有的话就说"没有"。');
        return;
      }
    }

    if (!hasSaving && state.step <= 3) {
      const num = extractNumber(message);
      if (num !== null || /没有|无|0|不存|不攒|否/.test(message)) {
        state.collected.savingTarget = num || 0;
        state.step = 4;
      } else {
        UI.renderAgentMessage('你计划每月存多少钱呢？哪怕¥50也好，积少成多～不想存就说"0"。');
        return;
      }
    }

    // Ask about special expenses if not provided
    if (!hasSpecial && state.step <= 4) {
      if (/没有|无|0|不|否|直接算|好了/.test(message) && state.collected.monthlyIncome) {
        state.collected.specialExpense = 0;
        computeAndShowBudget();
        return;
      }
      UI.renderAgentMessage('最后再问一个：这个月有没有**特殊的较大支出**？比如考试报名、同学聚会、旅行、买教材等。没有就说"没有"，我直接帮你算～');
      state.step = 5;
      return;
    }

    if (!hasSpecial && state.step === 5) {
      const num = extractNumber(message);
      if (num !== null) {
        state.collected.specialExpense = num;
      } else if (/没有|无|0|不|否/.test(message)) {
        state.collected.specialExpense = 0;
      } else {
        state.collected.specialExpense = 0;
      }
    }

    computeAndShowBudget();
  }

  function computeAndShowBudget() {
    const data = Tools.calculateBudget({
      monthlyIncome: Number(state.collected.monthlyIncome) || 0,
      fixedExpense: Number(state.collected.fixedExpense) || 0,
      specialExpense: Number(state.collected.specialExpense) || 0,
      savingTarget: Number(state.collected.savingTarget) || 0,
    });

    if (data.budgetStatus === 'infeasible') {
      UI.renderAgentMessage(data.advice);
    } else {
      UI.renderAgentMessage(
        `好的，帮你算好了 👇\n\n本月可自由支配约 **¥${data.availableSpending}**，储蓄占比 **${data.savingRatio}%**，整体状态：**${data.statusLabel}**。`
      );
      UI.renderBudgetCard(data);
      UI.renderAgentMessage(data.advice);
    }

    resetState();
    // Re-render quick actions for next interaction
    setTimeout(() => UI.renderQuickActions(), 500);
  }

  // ─── Savings Flow ─────────────────────────────────────────────────

  function startSavingFlow(entities) {
    resetState();
    state.context = 'saving';
    state.collected = entities;

    const hasTarget = entities.targetAmount && entities.targetAmount > 0;
    const hasCurrent = entities.currentAmount !== undefined;
    const hasDeadline = entities.deadlineWeeks && entities.deadlineWeeks > 0;

    if (hasTarget && hasDeadline) {
      // We have enough info
      computeAndShowSavingPlan();
      return;
    }

    if (hasTarget) {
      state.step = 2;
      UI.renderAgentMessage(
        `收到！想攒 **¥${entities.targetAmount}**${entities.goalName ? '买' + entities.goalName : ''}，这个目标很清晰～\n\n接下来需要知道：\n⏰ **你计划用多长时间攒到？**\n比如"3个月"、"12周"等。`
      );
    } else {
      state.step = 1;
      UI.renderAgentMessage(
        '好的，我来帮你制定攒钱计划！🎯\n\n先告诉我：\n💰 **你想攒多少钱？目标是什么？**\n\n比如："想三个月攒1500元买耳机"、"想存2000元做应急金"～'
      );
    }
  }

  function handleSavingFlow(message, intent, entities) {
    Object.assign(state.collected, entities);

    const hasTarget = state.collected.targetAmount && state.collected.targetAmount > 0;
    const hasDeadline = state.collected.deadlineWeeks && state.collected.deadlineWeeks > 0;

    if (!hasTarget) {
      const num = extractNumber(message);
      if (num && num >= 10) {
        state.collected.targetAmount = num;
        // Try to extract goal name
        const nameMatch = message.match(/(?:买|攒|存)(?:一个|一台|一部)?(.{1,8}?)(?:\d|元|块|$|，|。)/);
        if (nameMatch) state.collected.goalName = nameMatch[1].trim();
      } else {
        UI.renderAgentMessage('请告诉我具体想攒多少钱～比如"1500元"或"攒2000买电脑"。');
        return;
      }
    }

    if (!hasDeadline) {
      // Try to extract time from message or from entities
      if (!state.collected.deadlineWeeks) {
        const timeMatch = message.match(/(\d+)\s*(?:个?\s*月|个月|月)/);
        if (timeMatch) {
          state.collected.deadlineWeeks = parseInt(timeMatch[1]) * 4;
        } else {
          const weekMatch = message.match(/(\d+)\s*(?:周|星期)/);
          if (weekMatch) {
            state.collected.deadlineWeeks = parseInt(weekMatch[1]);
          }
        }
      }

      if (!state.collected.deadlineWeeks) {
        UI.renderAgentMessage('计划用多长时间呢？告诉我就行～比如"3个月"或"12周"。');
        return;
      }
    }

    // Ask for current savings
    if (state.collected.currentAmount === undefined) {
      if (/没有|0|还没|无|否/.test(message) && state.collected.deadlineWeeks) {
        state.collected.currentAmount = 0;
        computeAndShowSavingPlan();
        return;
      }
      UI.renderAgentMessage('最后确认一下：**目前已经存了多少了？** 还没开始存就说"0"～');
      state.step = 3;
      return;
    }

    computeAndShowSavingPlan();
  }

  function computeAndShowSavingPlan() {
    const data = Tools.createSavingPlan({
      targetAmount: Number(state.collected.targetAmount) || 0,
      currentAmount: Number(state.collected.currentAmount) || 0,
      deadlineWeeks: Number(state.collected.deadlineWeeks) || 12,
    });

    if (data.message && !data.plans) {
      UI.renderAgentMessage(data.message);
    } else {
      UI.renderAgentMessage(
        `帮你算好啦～目标**¥${data.targetAmount}**，目前还差 **¥${data.remainingAmount}**。\n\n标准方案是每周存 **¥${data.weeklyRequired}**，下面是三档计划，你可以根据自己的情况选择：`
      );
      UI.renderSavingPlanCard(data);
      UI.renderAgentMessage(
        '💡 我的建议是先从**标准版**开始，如果觉得压力大可以随时切换到轻松版。超支了也没关系，回来找我重新规划就好，不批评你～'
      );
    }

    if (data.warnings && data.warnings.length > 0) {
      setTimeout(() => {
        data.warnings.forEach(w => UI.renderAgentMessage('⚠️ ' + w));
      }, 300);
    }

    resetState();
    setTimeout(() => UI.renderQuickActions(), 600);
  }

  // ─── Risk Flow ────────────────────────────────────────────────────

  function startRiskFlow(entities) {
    resetState();
    state.context = 'risk';
    state.collected = entities;
    state.riskAnswers = [];
    state.step = 0;

    UI.renderAgentMessage(
      '我理解你对投资的好奇心～不过在聊具体的之前，我想先请你回答三个问题 🧊\n\n这叫做「**投前冷静三问**」，帮我们判断这笔钱是否适合承担风险：'
    );

    setTimeout(() => {
      askRiskQuestion(0);
    }, 500);
  }

  function askRiskQuestion(index) {
    state.step = index;
    UI.renderRiskQuestion(CONFIG.RISK_QUESTIONS[index], index);
  }

  function handleRiskAnswer(qIndex, answer) {
    state.riskAnswers[qIndex] = answer;
    UI.updateRiskQuestionAnswered(qIndex);

    if (qIndex < 2) {
      setTimeout(() => askRiskQuestion(qIndex + 1), 400);
    } else {
      // All three answered — compute result
      setTimeout(() => {
        const result = Tools.checkInvestmentRisk({
          assetType: state.collected.assetType || '未指定',
          needWithin3Months: state.riskAnswers[0] === 'yes',
          canAcceptLoss: state.riskAnswers[1] !== 'yes',
          understandProduct: state.riskAnswers[2] === 'yes',
        });

        UI.renderRiskCheckCard(result);
        UI.renderAgentMessage(
          '无论你的答案是什么，我都建议先完成「**预算管理**」和「**攒钱目标**」，再考虑投资。\n\n先管好生活费现金流，再慢慢理解投资～ 📚 有什么理财概念想了解吗？'
        );
        resetState();
        setTimeout(() => UI.renderQuickActions(), 600);
      }, 600);
    }
  }

  function handleRiskFlow(message, intent, entities) {
    // Handled via button clicks in risk questions — fallback for text input
    const answer = message.trim();
    if (/是|对|需要|会影响|是的|会的/.test(answer)) {
      handleRiskAnswer(state.step, 'yes');
    } else if (/否|不|不会|不影响|不是/.test(answer)) {
      handleRiskAnswer(state.step, 'no');
    } else {
      UI.renderAgentMessage('请选择"是"或"否"来回答上面的问题～点击按钮更方便哦 👆');
    }
  }

  // ─── Knowledge Query ──────────────────────────────────────────────

  function handleKnowledgeQuery(entities) {
    const message = state.history[state.history.length - 1]?.content || '';

    if (/复利/.test(message)) {
      UI.renderAgentMessage(
        '**复利**就是"利滚利"——利息也能产生新的利息。\n\n举个例子：\n- 你存了 ¥1,000，年利率 5%\n- 第一年利息 ¥50，总额 ¥1,050\n- 第二年利息 ¥52.50（因为 ¥1,050 × 5%）\n\n时间越长，复利效果越明显。这就是为什么理财建议总是说"尽早开始"～\n\n不过要注意，复利对**负债**也有效——信用卡分期、网贷的利息也是复利滚动的，所以要尽量避免透支消费！'
      );
    } else if (/利率|利息/.test(message)) {
      UI.renderAgentMessage(
        '**利率**简单说就是钱的"价格"。\n\n存款利率 = 银行付给你的钱\n贷款利率 = 你付给银行的钱\n\n对于大学生来说，最重要的是了解：\n1. 信用卡取现和分期的实际利率通常很高（年化15%–18%）\n2. 花呗/白条虽然方便，但如果分期，实际成本不低\n3. 储蓄账户的活期利率很低，如果有闲钱可以考虑定期或货币基金\n\n需要了解更多具体概念吗？'
      );
    } else if (/风险/.test(message)) {
      UI.renderAgentMessage(
        '理财中的**风险**主要有几类：\n\n1. **市场风险**：资产价格波动，买的基金/股票可能下跌\n2. **流动性风险**：需要用钱时取不出来（比如定期存款提前取会损失利息）\n3. **信用风险**：借钱的人/机构还不起了\n4. **通胀风险**：钱放着不投资，购买力被通胀侵蚀\n\n对大学生来说，最重要的不是追求高收益，而是：\n✅ 先建立应急金（3个月生活费）\n✅ 理解不同产品的风险等级\n✅ 不要跟风买自己不懂的东西\n\n还有更具体的想问吗？'
      );
    } else {
      UI.renderAgentMessage(
        '这个问题涉及金融基础知识 📚\n\n我目前可以解释的概念包括：\n- 复利、利率、利息\n- 风险、流动性、波动\n- 基金类型、股票基础\n- 预算管理、储蓄策略\n\n你可以具体问一个概念，我来用校园语言解释给你听～'
      );
    }
  }

  // ─── Expense Review ───────────────────────────────────────────────

  function handleExpenseReview() {
    resetState();
    state.context = 'review';
    UI.renderAgentMessage(
      '复盘是个好习惯！👍\n\n目前Demo版本暂不支持真实消费数据导入，但我可以帮你做**预算执行检查**：\n\n如果你告诉我这几项，我就能判断你的预算执行情况：\n- 📥 本月生活费多少？\n- 💸 已经花了多少？\n- 🎯 储蓄目标完成了多少？\n\n或者你也可以用「预算规划」功能，先建立本月的预算框架～'
    );
    resetState();
    setTimeout(() => UI.renderQuickActions(), 500);
  }

  function handleReviewFlow(message, intent, entities) {
    // Simple handling — redirect to budget
    UI.renderAgentMessage('你可以先通过「预算规划」建立本月的预算框架，然后再来复盘。告诉我你的月生活费，我们开始吧～');
    resetState();
    startBudgetFlow(entities);
  }

  // ─── Small Talk ───────────────────────────────────────────────────

  function handleSmallTalk(message) {
    if (/你好|嗨|hello|在吗/i.test(message)) {
      UI.renderAgentMessage('嗨～我是你的钱搭子 🐷 可以帮你做预算、定攒钱目标、或者聊聊理财基础知识。有什么需要随时说！');
    } else if (/谢谢|感谢|多谢/.test(message)) {
      UI.renderAgentMessage('不客气！有问题随时找我～记得定期复盘你的预算和目标哦 😊');
    } else if (/焦虑|压力|担心|害怕/.test(message)) {
      UI.renderAgentMessage(
        '我能理解你的感受。理财这件事不用急，一步一步来～\n\n如果是因为钱的问题感到焦虑，我们可以先从最简单的做起：\n1. 先了解你的收入和支出\n2. 设定一个小目标（哪怕每月存¥50）\n3. 慢慢建立习惯\n\n如果焦虑感很强烈，也建议和身边信任的朋友、家人或学校心理中心聊聊。钱是工具，不是负担 💪'
      );
    } else if (/做什么|能干嘛|功能|帮什么/.test(message)) {
      UI.renderAgentMessage(
        '我能帮你做这些事：\n\n💸 **生活费预算**：帮你把一个月的生活费拆成可执行的每周预算\n🎯 **攒钱陪跑**：制定攒钱目标计划（轻松版/标准版/冲刺版）\n🛡️ **投前冷静**：在你考虑投资前，帮你判断风险承受能力\n📚 **理财知识**：用校园语言解释金融概念\n\n你可以点击下面的快捷入口，或者直接告诉我需求～'
      );
      UI.renderQuickActions();
    } else {
      UI.renderAgentMessage('好的～有什么理财或预算方面的问题想聊吗？你也可以用下面的快捷入口快速开始 👇');
      UI.renderQuickActions();
    }
  }

  // ─── Unknown Intent ───────────────────────────────────────────────

  function handleUnknown(message) {
    UI.renderAgentMessage(
      '我不太确定你想做什么～目前我能帮你的是：\n\n💸 **生活费预算规划**\n🎯 **攒钱目标计划**\n🛡️ **投资前风险检查**\n📚 **基础理财知识**\n\n你可以直接说"帮我做预算"、"我想攒钱"、"我想了解投资"之类的，或者点击下面的快捷入口 👇'
    );
    UI.renderQuickActions();
  }

  // ─── Quick Action Handlers ────────────────────────────────────────

  function quickAction(id) {
    switch (id) {
      case 'budget':
        handleUserMessage('帮我做这个月的生活费预算');
        break;
      case 'saving':
        handleUserMessage('我想攒钱，帮我做个攒钱计划');
        break;
      case 'invest':
        handleUserMessage('我想了解理财和投资');
        break;
      case 'review':
        handleUserMessage('帮我复盘一下最近的消费');
        break;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  function extractNumber(text) {
    const cleaned = text.replace(/[,，]/g, '');
    const m = cleaned.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }

  return {
    handleUserMessage,
    handleRiskAnswer,
    quickAction,
    resetState,
    getState: () => state,
  };
})();

window.Chat = Chat;
