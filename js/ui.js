/**
 * MoneyMate 钱搭子 — UI Renderer
 * Renders chat bubbles, cards, and interactive components into the DOM.
 */
const UI = (() => {
  const chatContainer = () => document.getElementById('chatMessages');

  // ─── Helpers ──────────────────────────────────────────────────────

  function scrollToBottom(smooth = true) {
    const container = document.getElementById('chatScroll');
    if (container) {
      setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
      }, 50);
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function html(strings, ...values) {
    let result = '';
    strings.forEach((str, i) => {
      result += str + (values[i] !== undefined ? values[i] : '');
    });
    return result;
  }

  // ─── Chat Bubbles ─────────────────────────────────────────────────

  function renderUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-row user';
    div.innerHTML = `<div class="bubble">${escapeHTML(text)}</div>`;
    chatContainer().appendChild(div);
    scrollToBottom();
  }

  function renderAgentMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-row agent';
    // Convert basic markdown in agent messages
    const formatted = escapeHTML(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    div.innerHTML = `
      <div class="agent-avatar">🐷</div>
      <div class="bubble">${formatted}</div>`;
    chatContainer().appendChild(div);
    scrollToBottom();
    return div;
  }

  function renderTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-row agent typing-indicator';
    div.innerHTML = `
      <div class="agent-avatar">🐷</div>
      <div class="bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>`;
    chatContainer().appendChild(div);
    scrollToBottom();
    return div;
  }

  function removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // ─── Cards ────────────────────────────────────────────────────────

  /**
   * Budget result card.
   */
  function renderBudgetCard(data) {
    const card = document.createElement('div');
    card.className = 'msg-card budget-card';
    const statusColor = data.statusClass === 'green' ? CONFIG.COLORS.green :
                        data.statusClass === 'red' ? CONFIG.COLORS.red :
                        CONFIG.COLORS.gold;

    card.innerHTML = `
      <div class="budget-card-header">
        <div class="budget-circle" style="border-color:${statusColor};background:${data.statusClass === 'red' ? CONFIG.COLORS.redLight : CONFIG.COLORS.goldLight}">
          <span class="big-num" style="color:${statusColor}">¥${data.weeklyBudget}</span>
          <span class="big-lbl">每周预算</span>
        </div>
        <div class="budget-status-tag" style="background:${statusColor};color:white">${data.statusLabel}</div>
      </div>
      <div class="budget-rows">
        <div class="budget-row"><span class="br-label">📥 本月生活费</span><span class="br-value red">¥${data.monthlyIncome}</span></div>
        <div class="budget-row"><span class="br-label">📤 固定支出</span><span class="br-value">¥${data.fixedExpense}</span></div>
        ${data.specialExpense > 0 ? `<div class="budget-row"><span class="br-label">📋 特殊支出</span><span class="br-value">¥${data.specialExpense}</span></div>` : ''}
        <div class="budget-row"><span class="br-label">🎯 储蓄目标</span><span class="br-value gold">¥${data.savingTarget}</span></div>
        <div class="budget-row strong"><span class="br-label">💰 可自由支配</span><span class="br-value red" style="font-size:16px">¥${data.availableSpending}</span></div>
        <div class="budget-row"><span class="br-label">📅 每日参考</span><span class="br-value">¥${data.dailyReference}</span></div>
      </div>
      <div class="budget-category-section">
        <div class="section-title">消费结构建议</div>
        <div class="stat-row">
          <div class="stat-item"><div class="stat-val">${Math.round(data.categoryBudget.food / data.availableSpending * 100)}%</div><div class="stat-lbl">餐饮</div></div>
          <div class="stat-item"><div class="stat-val">${Math.round(data.categoryBudget.entertainment / data.availableSpending * 100)}%</div><div class="stat-lbl">社交娱乐</div></div>
          <div class="stat-item"><div class="stat-val">${Math.round(data.categoryBudget.study / data.availableSpending * 100)}%</div><div class="stat-lbl">学习</div></div>
          <div class="stat-item"><div class="stat-val">${Math.round(data.categoryBudget.flexible / data.availableSpending * 100)}%</div><div class="stat-lbl">灵活备用</div></div>
        </div>
        <div class="budget-bar-section">
          <div class="budget-bar-label"><span>预算使用进度</span><span style="color:${statusColor};font-weight:600">${data.budgetStatus === 'infeasible' ? '超支风险' : '安全'}</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, Math.max(5, data.savingRatio + 20))}%;background:${statusColor}"></div></div>
        </div>
      </div>`;
    chatContainer().appendChild(card);
    scrollToBottom();
  }

  /**
   * Savings plan card with three tiers.
   */
  function renderSavingPlanCard(data) {
    const card = document.createElement('div');
    card.className = 'msg-card saving-card';

    if (data.message && !data.plans) {
      // Goal already achieved
      card.innerHTML = `<div class="saving-achieved">${data.message}</div>`;
      chatContainer().appendChild(card);
      scrollToBottom();
      return;
    }

    const progress = data.targetAmount > 0
      ? Math.min(100, Math.round(data.currentAmount / data.targetAmount * 100))
      : 0;

    card.innerHTML = `
      <div class="saving-header">
        <div class="saving-goal-info">
          <span class="saving-goal-emoji">🎯</span>
          <div>
            <div class="saving-goal-amount">目标 ¥${data.targetAmount}</div>
            <div class="saving-goal-detail">已存 ¥${data.currentAmount} · 剩余 ¥${data.remainingAmount}</div>
          </div>
        </div>
        <div class="saving-progress-ring">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#E8E8E8" stroke-width="5"/>
            <circle cx="32" cy="32" r="28" fill="none" stroke="${CONFIG.COLORS.gold}" stroke-width="5"
                    stroke-dasharray="${Math.round(progress / 100 * 176)} 176" stroke-linecap="round"
                    transform="rotate(-90 32 32)"/>
          </svg>
          <span class="saving-progress-text">${progress}%</span>
        </div>
      </div>
      <div class="saving-plans-section">
        <div class="section-title">三档攒钱计划</div>
        <div class="plan-cards-container">
          ${renderPlanCard('easy', data.plans.easy)}
          ${renderPlanCard('standard', data.plans.standard, true)}
          ${renderPlanCard('sprint', data.plans.sprint)}
        </div>
      </div>
      ${data.warnings && data.warnings.length > 0 ? `
        <div class="alert alert-warning">⚠️ ${data.warnings.join('<br>')}</div>
      ` : ''}
    `;

    chatContainer().appendChild(card);
    scrollToBottom();
  }

  function renderPlanCard(type, plan, selected = false) {
    const cls = type === 'standard' ? 'plan-card standard selected' : `plan-card ${type}`;
    return `
      <div class="${cls}" onclick="UI.selectPlan(this, '${type}')">
        <div class="plan-name">${plan.label}</div>
        <div class="plan-amount">¥${plan.weeklySaving}/周</div>
        <div class="plan-desc">${plan.description}</div>
        <div class="plan-detail">${plan.detail}</div>
      </div>`;
  }

  /**
   * Risk check card.
   */
  function renderRiskCheckCard(data) {
    const card = document.createElement('div');
    card.className = 'msg-card risk-card';
    const riskColors = { high: CONFIG.COLORS.red, medium: CONFIG.COLORS.gold, low: CONFIG.COLORS.green };
    const riskColor = riskColors[data.riskLevel] || CONFIG.COLORS.red;
    const riskLabels = { high: '高风险', medium: '中风险', low: '低风险' };

    card.innerHTML = `
      <div class="risk-card-header" style="border-left: 4px solid ${riskColor}">
        <div class="risk-level-tag" style="background:${riskColor};color:white">风险等级：${riskLabels[data.riskLevel]}</div>
        <div class="risk-conclusion">${data.conclusion}</div>
      </div>
      <div class="risk-education">
        <div class="section-title">📚 知识要点</div>
        <ul class="education-list">
          ${data.educationPoints.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="risk-disclaimer">
        <div class="disclaimer-title">🛡️ 风险边界</div>
        <div class="disclaimer-items">
          <div class="disclaimer-item">✗ 不推荐具体股票、基金或理财产品</div>
          <div class="disclaimer-item">✗ 不承诺收益</div>
          <div class="disclaimer-item">✗ 不使用「稳赚、保本、无风险」等表达</div>
          <div class="disclaimer-item">✗ 不鼓励借钱投资</div>
        </div>
      </div>
    `;
    chatContainer().appendChild(card);
    scrollToBottom();
  }

  /**
   * Risk question card for interactive Q&A.
   */
  function renderRiskQuestion(question, qIndex) {
    const card = document.createElement('div');
    card.className = 'msg-card risk-question-card';
    card.id = `risk-q-${qIndex}`;
    card.innerHTML = `
      <div class="question-card-inner">
        <div class="question-num">0${qIndex + 1}</div>
        <div class="question-text">
          <strong>${question.question}</strong>
          <div class="question-actions">
            <button class="btn btn-risk-yes" onclick="Chat.handleRiskAnswer(${qIndex}, 'yes')">是 / 影响</button>
            <button class="btn btn-risk-no" onclick="Chat.handleRiskAnswer(${qIndex}, 'no')">否 / 不影响</button>
          </div>
        </div>
      </div>`;
    chatContainer().appendChild(card);
    scrollToBottom();
    return card;
  }

  function updateRiskQuestionAnswered(qIndex) {
    const card = document.getElementById(`risk-q-${qIndex}`);
    if (card) {
      card.style.opacity = '0.5';
      card.querySelector('.question-actions').innerHTML =
        '<span style="color:var(--cmb-mid-gray);font-size:13px;">✓ 已记录</span>';
    }
  }

  // ─── Plan Selection ───────────────────────────────────────────────

  function selectPlan(el, type) {
    const container = el.closest('.plan-cards-container');
    if (container) {
      container.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
    }
    el.classList.add('selected');

    const planNames = { easy: '轻松版 🌱', standard: '标准版 ⭐', sprint: '冲刺版 🚀' };
    showToast(`已选择 ${planNames[type]} 计划`);
  }

  // ─── Quick Actions ────────────────────────────────────────────────

  function renderQuickActions() {
    const div = document.createElement('div');
    div.className = 'quick-actions-row';
    div.innerHTML = CONFIG.QUICK_ACTIONS.map(a => `
      <button class="quick-action-btn" onclick="Chat.quickAction('${a.id}')">
        <span class="qa-icon">${a.icon}</span>
        <span class="qa-label">${a.label}</span>
        <span class="qa-desc">${a.desc}</span>
      </button>
    `).join('');
    chatContainer().appendChild(div);
  }

  // ─── Welcome Message ──────────────────────────────────────────────

  function renderWelcome() {
    const div = document.createElement('div');
    div.className = 'welcome-block';
    div.innerHTML = `
      <div class="welcome-greeting">
        <div class="welcome-avatar">🐷</div>
        <h2>嗨，我是你的钱搭子</h2>
        <p>告诉我这个月生活费有多少、想攒多少钱，或者最近想问什么理财问题～<br>我不卖产品，只帮你管理好自己的现金流。</p>
      </div>
    `;
    chatContainer().appendChild(div);
    renderQuickActions();
    scrollToBottom(false);
  }

  // ─── Toast ────────────────────────────────────────────────────────

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  }

  // ─── Clear Chat ───────────────────────────────────────────────────

  function clearChat() {
    chatContainer().innerHTML = '';
  }

  // ─── Public API ───────────────────────────────────────────────────

  return {
    renderUserMessage,
    renderAgentMessage,
    renderTypingIndicator,
    removeTypingIndicator,
    renderBudgetCard,
    renderSavingPlanCard,
    renderRiskCheckCard,
    renderRiskQuestion,
    updateRiskQuestionAnswered,
    renderWelcome,
    renderQuickActions,
    selectPlan,
    showToast,
    scrollToBottom,
    clearChat,
  };
})();

window.UI = UI;
