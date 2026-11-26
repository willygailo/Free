(function () {
  'use strict';

  var Store = window.ConfessionStore;
  var AI = window.ConfessionAI;

  var TABS = ['flagged', 'pending', 'approved', 'rejected'];
  var state = {
    activeStatus: 'flagged',
    searchQuery: '',
  };

  var els = {};

  function cacheElements() {
    els.loginView = document.getElementById('loginView');
    els.dashboardView = document.getElementById('dashboardView');
    els.adminLoginForm = document.getElementById('adminLoginForm');
    els.adminPasswordInput = document.getElementById('adminPasswordInput');
    els.loginError = document.getElementById('loginError');
    els.statusTabs = document.getElementById('statusTabs');
    els.adminSearchInput = document.getElementById('adminSearchInput');
    els.adminList = document.getElementById('adminList');
    els.adminRefreshBtn = document.getElementById('adminRefreshBtn');
    els.exportJsonBtn = document.getElementById('exportJsonBtn');
    els.importJsonInput = document.getElementById('importJsonInput');
    els.resetDemoBtn = document.getElementById('resetDemoBtn');
    els.logoutBtn = document.getElementById('logoutBtn');
    els.changePasscodeForm = document.getElementById('changePasscodeForm');
    els.newPasscodeInput = document.getElementById('newPasscodeInput');
    els.toast = document.getElementById('toast');
  }

  var toastTimer = null;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.add('hidden');
    }, 2400);
  }

  function renderViewVisibility() {
    var authed = Store.isAdminSignedIn();
    els.loginView.classList.toggle('hidden', authed);
    els.dashboardView.classList.toggle('hidden', !authed);
    if (authed) {
      renderDashboard();
    }
  }

  function renderTabs(counts) {
    els.statusTabs.textContent = '';
    TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (state.activeStatus === tab ? ' active' : '');
      btn.textContent =
        tab.charAt(0).toUpperCase() +
        tab.slice(1) +
        ' (' +
        (counts[tab] || 0) +
        ')';
      btn.addEventListener('click', function () {
        state.activeStatus = tab;
        renderDashboard();
      });
      els.statusTabs.appendChild(btn);
    });
  }

  function renderDashboard() {
    var res = Store.listAdmin({
      status: state.activeStatus,
      q: state.searchQuery,
    });

    renderTabs(res.counts);
    els.adminList.textContent = '';

    if (res.confessions.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'glass-card empty-state';
      var title = document.createElement('h3');
      title.className = 'section-heading';
      title.textContent = 'No ' + state.activeStatus + ' confessions';
      var sub = document.createElement('p');
      sub.className = 'muted-sub';
      sub.textContent = 'Everything in this queue is clear.';
      empty.appendChild(title);
      empty.appendChild(sub);
      els.adminList.appendChild(empty);
      return;
    }

    res.confessions.forEach(function (confession) {
      var card = document.createElement('div');
      card.className = 'glass-card confession-card';

      // Top bar
      var meta = document.createElement('div');
      meta.className = 'card-meta';

      var badges = document.createElement('div');
      badges.className = 'toolbar-title-group';

      var statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge status-' + confession.status;
      statusBadge.textContent = confession.status;
      badges.appendChild(statusBadge);

      var catBadge = document.createElement('span');
      catBadge.className = 'pill-badge';
      catBadge.textContent = '#' + (confession.category || 'Confession');
      badges.appendChild(catBadge);

      if ((confession.report_count || 0) > 0) {
        var repBadge = document.createElement('span');
        repBadge.className = 'status-badge status-rejected';
        repBadge.textContent = '🚩 ' + confession.report_count + ' report(s)';
        badges.appendChild(repBadge);
      }

      var timeEl = document.createElement('span');
      timeEl.textContent = new Date(confession.created_at).toLocaleString();

      meta.appendChild(badges);
      meta.appendChild(timeEl);
      card.appendChild(meta);

      // Content
      var body = document.createElement('p');
      body.className = 'confession-body';
      body.textContent = confession.content;
      card.appendChild(body);

      // Moderation reason
      if (confession.moderation_reason) {
        var reasonBox = document.createElement('div');
        reasonBox.className = 'alert alert-warning';
        reasonBox.textContent = '🛡️ ' + confession.moderation_reason;
        card.appendChild(reasonBox);
      }

      // AI bubble
      if (confession.ai_emoji || confession.ai_comment) {
        var bubble = document.createElement('div');
        bubble.className = 'ai-bubble';
        var emojiBox = document.createElement('div');
        emojiBox.className = 'ai-emoji';
        emojiBox.textContent = confession.ai_emoji || '🤖';
        var textBox = document.createElement('div');
        var label = document.createElement('div');
        label.className = 'ai-label';
        label.textContent = '✨ AI Companion';
        textBox.appendChild(label);
        if (confession.ai_comment) {
          var cp = document.createElement('p');
          cp.className = 'ai-comment';
          cp.textContent = confession.ai_comment;
          textBox.appendChild(cp);
        }
        bubble.appendChild(emojiBox);
        bubble.appendChild(textBox);
        card.appendChild(bubble);
      }

      // Note input
      var noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.className = 'input';
      noteInput.placeholder = 'Optional moderation note...';
      card.appendChild(noteInput);

      // Action buttons
      var actions = document.createElement('div');
      actions.className = 'admin-actions';

      if (confession.status !== 'approved') {
        var approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'btn btn-primary btn-sm';
        approveBtn.textContent = '✓ Approve';
        approveBtn.addEventListener('click', async function () {
          var aiData =
            confession.ai_comment
              ? {}
              : await AI.react(confession.content, confession.category);
          Store.updateConfessionAdmin(
            confession.id,
            Object.assign(
              {
                status: 'approved',
                moderation_reason: noteInput.value.trim() || null,
              },
              aiData.comment
                ? { ai_emoji: aiData.emoji, ai_comment: aiData.comment }
                : {}
            )
          );
          showToast('Confession approved.');
          renderDashboard();
        });
        actions.appendChild(approveBtn);
      }

      if (confession.status !== 'rejected') {
        var rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'btn btn-secondary btn-sm';
        rejectBtn.textContent = '✕ Reject';
        rejectBtn.addEventListener('click', function () {
          Store.updateConfessionAdmin(confession.id, {
            status: 'rejected',
            moderation_reason:
              noteInput.value.trim() ||
              confession.moderation_reason ||
              'Rejected by admin.',
          });
          showToast('Confession rejected.');
          renderDashboard();
        });
        actions.appendChild(rejectBtn);
      }

      var regenBtn = document.createElement('button');
      regenBtn.type = 'button';
      regenBtn.className = 'btn btn-ghost btn-sm';
      regenBtn.textContent = '✨ Regenerate AI';
      regenBtn.addEventListener('click', async function () {
        var aiData = await AI.react(confession.content, confession.category);
        Store.updateConfessionAdmin(confession.id, {
          ai_emoji: aiData.emoji,
          ai_comment: aiData.comment,
        });
        showToast('AI reaction updated.');
        renderDashboard();
      });
      actions.appendChild(regenBtn);

      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = '🗑 Delete';
      deleteBtn.addEventListener('click', function () {
        Store.deleteConfession(confession.id);
        showToast('Confession deleted.');
        renderDashboard();
      });
      actions.appendChild(deleteBtn);

      card.appendChild(actions);
      els.adminList.appendChild(card);
    });
  }

  function bindEvents() {
    els.adminLoginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var pass = els.adminPasswordInput.value;
      if (Store.verifyAdminPasscode(pass)) {
        Store.setAdminSignedIn(true);
        els.loginError.classList.add('hidden');
        els.adminPasswordInput.value = '';
        renderViewVisibility();
      } else {
        els.loginError.textContent = 'Invalid admin passcode.';
        els.loginError.classList.remove('hidden');
      }
    });

    els.logoutBtn.addEventListener('click', function () {
      Store.setAdminSignedIn(false);
      renderViewVisibility();
    });

    els.adminRefreshBtn.addEventListener('click', function () {
      renderDashboard();
      showToast('Queue refreshed.');
    });

    var searchTimer = null;
    els.adminSearchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.searchQuery = els.adminSearchInput.value;
        renderDashboard();
      }, 200);
    });

    els.exportJsonBtn.addEventListener('click', function () {
      var blob = new Blob([Store.exportJson()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'confessions-backup.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported JSON backup.');
    });

    els.importJsonInput.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var count = Store.importJson(String(reader.result || '[]'));
          renderDashboard();
          showToast('Imported ' + count + ' confessions.');
        } catch (err) {
          showToast(err.message || 'Invalid JSON file.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    els.resetDemoBtn.addEventListener('click', function () {
      Store.resetDemoData();
      renderDashboard();
      showToast('Demo confessions restored.');
    });

    els.changePasscodeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var next = els.newPasscodeInput.value.trim();
      if (next.length < 4) return;
      Store.setAdminPasscode(next);
      els.newPasscodeInput.value = '';
      showToast('Admin passcode updated.');
    });

    window.addEventListener('storage', function () {
      if (Store.isAdminSignedIn()) {
        renderDashboard();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    bindEvents();
    renderViewVisibility();
  });
})();
