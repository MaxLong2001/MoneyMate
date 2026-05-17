/**
 * MoneyMate 钱搭子 — Configuration
 * Constants, keywords, system prompt, and response templates.
 */
const CONFIG = {
  // Brand colors
  COLORS: {
    red: '#D71920',
    darkRed: '#8A0F14',
    gold: '#C89B3C',
    goldLight: '#FBF3E0',
    dark: '#2B2B2B',
    midGray: '#666666',
    lightGray: '#F7F7F7',
    white: '#FFFFFF',
    redLight: '#FEF0F0',
    redBg: '#FCF3F3',
    green: '#2E7D32',
    greenLight: '#E8F5E9',
  },

  // Intent keywords (from dev docs §4)
  INTENT_KEYWORDS: {
    BUDGET_PLAN: [
      '生活费', '预算', '这个月怎么花', '月底没钱', '每周能花多少',
      '每月能花多少', '怎么安排', '还剩多少', '还能花多少', '预算规划',
      '每月预算', '花钱计划',
    ],
    SAVING_GOAL: [
      '攒钱', '存钱', '想买', '目标', '几个月攒', '应急金',
      '攒', '存', '储蓄目标', '省钱', '存款',
    ],
    EXPENSE_REVIEW: [
      '花多了', '超支', '复盘', '钱去哪了', '消费记录',
      '花超了', '花太多', '超预算',
    ],
    INVESTMENT_RISK_CHECK: [
      '基金', '股票', '理财', '收益', '买不买', '币', '黄金', '投资',
      '年化', '买入', '抄底', '暴涨', '翻倍', '保本', '高收益', '稳赚',
      '推荐', '赚钱', '赚多少',
    ],
    FINANCIAL_KNOWLEDGE: [
      '什么是', '怎么理解', '区别', '风险', '利率', '复利',
      '解释一下', '什么意思', '不懂', '了解',
    ],
    SMALL_TALK: [
      '你好', '谢谢', '我好焦虑', '不想省钱', '在吗', '嗨',
      'hello', '你是谁', '能做什么', '帮我',
    ],
  },

  // Risk check questions (from dev docs §8)
  RISK_QUESTIONS: [
    {
      id: 'q1',
      question: '这笔钱未来3个月是否需要用于生活费、学费、考试、旅行或其他确定支出？',
      field: 'need_within_3_months',
    },
    {
      id: 'q2',
      question: '如果短期亏损10%–20%，是否会影响你的正常生活？',
      field: 'can_accept_loss',
    },
    {
      id: 'q3',
      question: '你是否理解这个产品主要投资什么、为什么会涨、为什么会跌？',
      field: 'understand_product',
    },
  ],

  // System prompt (from dev docs §9)
  SYSTEM_PROMPT: `你是"钱搭子 MoneyMate"，一款面向在校大学生的理财陪伴AI智能体。

你的核心目标：
1. 帮助大学生制定生活费预算；
2. 帮助大学生拆解攒钱目标；
3. 帮助大学生理解基础理财知识和投资风险；
4. 陪伴用户建立稳定、健康、可持续的消费和储蓄习惯。

你的语气：
- 像一个理性但不扫兴的学长/学姐；
- 温和、具体、可执行；
- 不羞辱用户，不制造焦虑；
- 不一味劝用户省钱，而是帮助用户判断消费是否影响目标；
- 用户超支时，优先给出补救方案。

你必须遵守的边界：
- 不推荐具体股票、基金、币、保险、贷款或任何金融产品；
- 不承诺收益；
- 不使用"稳赚、保本、高收益、无风险"等表达；
- 不鼓励借钱投资；
- 不要求用户提供银行卡号、身份证号、手机号、详细住址等敏感信息；
- 如果用户询问具体投资买卖建议，必须触发"投前冷静三问"；
- 如果用户表达严重焦虑、极端压力或自我伤害倾向，应停止财务建议，建议其寻求身边可信任的人或专业帮助。

你的回答结构：
- 先简短回应用户情绪或需求；
- 再给出计算或判断；
- 最后给出1–3个可执行建议；
- 必要时用表格展示预算、攒钱计划或风险检查结果。`,

  // Quick action prompts
  QUICK_ACTIONS: [
    { id: 'budget', icon: '💸', label: '帮我做预算', desc: '拆解每月生活费', prompt: '帮我做这个月的生活费预算' },
    { id: 'saving', icon: '🎯', label: '我要攒钱', desc: '制定攒钱目标计划', prompt: '我想攒钱，帮我做个攒钱计划' },
    { id: 'invest', icon: '🛡️', label: '我想问理财', desc: '了解投资风险', prompt: '我想了解理财和投资' },
    { id: 'review', icon: '📊', label: '复盘本周消费', desc: '看看钱花哪了', prompt: '帮我复盘一下最近的消费' },
  ],

  // Health status labels
  BUDGET_STATUS: {
    infeasible: { label: '不可行', cls: 'red', desc: '收入不足以覆盖支出+储蓄，建议降低目标或延长周期' },
    high_pressure: { label: '储蓄压力较高', cls: 'gold', desc: '储蓄占比超过35%，生活可能偏紧，建议参考轻松版方案' },
    healthy: { label: '较健康', cls: 'green', desc: '储蓄比例合理，可稳定执行' },
    low_saving: { label: '储蓄偏低', cls: 'red', desc: '储蓄比例不足10%，建议建立基础应急金' },
  },
};

// Make it globally accessible
window.CONFIG = CONFIG;
