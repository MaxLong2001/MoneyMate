/**
 * MoneyMate 钱搭子 — App Entry Point
 * Initializes the application, binds events.
 */
const App = (() => {

  function init() {
    // Render welcome screen
    UI.renderWelcome();

    // Bind input events
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      Chat.handleUserMessage(text);
      input.value = '';
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        Chat.handleUserMessage(text);
        input.value = '';
      }
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      Chat.resetState();
      UI.clearChat();
      UI.renderWelcome();
      UI.showToast('已重置对话');
    });

    // Nav items — highlight active tab
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Focus input on load
    setTimeout(() => input.focus(), 300);

    console.log('💰 钱搭子 MoneyMate MVP ready');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
