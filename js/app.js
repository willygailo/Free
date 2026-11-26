(function () {
  'use strict';

  var Store = window.ConfessionStore;
  var AI = window.ConfessionAI;
  var Effects = window.ConfessionEffects;

  var PAGE_SIZE = 12;
  var state = {
    filterEmotion: 'all',
    savedOnly: false,
    sortBy: 'newest',
    searchQuery: '',
    visibleLimit: PAGE_SIZE,
    sending: false,
    chatMessages: [],
    lastSource: 'local',
  };

  var els = {};

  function cacheElements() {
    els.chatCard = document.getElementById('chatCard');
    els.chatMoodEmoji = document.getElementById('chatMoodEmoji');
    els.liveMoodBadge = document.getElementById('liveMoodBadge');
    els.clearChatBtn = document.getElementById('clearChatBtn');
    els.chatMessages = document.getElementById('chatMessages');
    els.chatForm = document.getElementById('chatForm');
    els.chatInput = document.getElementById('chatInput');
    els.sendBtn = document.getElementById('sendBtn');
    els.sharePublicToggle = document.getElementById('sharePublicToggle');
    els.charCounter = document.getElementById('charCounter');
    els.chatError = document.getElementById('chatError');
    els.totalBadge = document.getElementById('totalBadge');
    els.syncStatusPill = document.getElementById('syncStatusPill');
    els.savedFilterBtn = document.getElementById('savedFilterBtn');
    els.searchInput = document.getElementById('searchInput');
    els.clearSearchBtn = document.getElementById('clearSearchBtn');
    els.emotionFilterChips = document.getElementById('emotionFilterChips');
    els.confessionList = document.getElementById('confessionList');
    els.loadMoreWrap = document.getElementById('loadMoreWrap');
    els.loadMoreBtn = document.getElementById('loadMoreBtn');
    els.refreshBtn = document.getElementById('refreshBtn');
    els.surpriseBtn = document.getElementById('surpriseBtn');
    els.themeToggleBtn = document.getElementById('themeToggleBtn');
    els.settingsBtn = document.getElementById('settingsBtn');
    els.settingsModal = document.getElementById('settingsModal');
    els.settingsForm = document.getElementById('settingsForm');
    els.supabaseUrlInput = document.getElementById('supabaseUrlInput');
    els.supabaseKeyInput = document.getElementById('supabaseKeyInput');
    els.aiProxyUrlInput = document.getElementById('aiProxyUrlInput');
    els.closeSettingsModal = document.getElementById('closeSettingsModal');
    els.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    els.exportJsonBtn = document.getElementById('exportJsonBtn');
    els.importJsonInput = document.getElementById('importJsonInput');
    els.resetDemoBtn = document.getElementById('resetDemoBtn');
    els.toast = document.getElementById('toast');
  }

  var toastTimer = null;
  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.add('hidden');
    }, 2400);
  }

  function applyTheme(theme) {
    var mode = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', mode);
    if (els.themeToggleBtn) {
      els.themeToggleBtn.textContent = mode === 'light' ? '☀️' : '🌙';
    }
  }

  function updateLiveMoodPreview(text) {
    var emotion = AI.detectEmotion(text);
    var meta = Effects.getMoodMeta(emotion);
    els.chatMoodEmoji.textContent = meta.emoji;
    els.liveMoodBadge.textContent = meta.emoji + ' ' + meta.label;
    Effects.setCardMood(els.chatCard, emotion);
  }

  function updateSyncBadge(source) {
    state.lastSource = source || (Store.isSharedMode() ? 'shared' : 'local');
    els.syncStatusPill.textContent =
      state.lastSource === 'shared'
        ? '🌐 Live Shared Wall'
        : '💾 Local Mode (Click ⚙️ to Share)';
  }

  function updateSavedPill() {
    var count = Store.getSavedIds().length;
    els.savedFilterBtn.textContent = '🔖 Saved (' + count + ')';
    els.savedFilterBtn.classList.toggle('active', state.savedOnly);
    els.savedFilterBtn.setAttribute('aria-pressed', String(state.savedOnly));
  }

  function renderEmotionFilterChips() {
    els.emotionFilterChips.textContent = '';
    Store.EMOTION_FILTERS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (state.filterEmotion === item.key ? ' active' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        state.filterEmotion = item.key;
        state.visibleLimit = PAGE_SIZE;
        renderEmotionFilterChips();
        renderWallList(false);
      });
      els.emotionFilterChips.appendChild(btn);
    });
  }

  function renderChatViewport() {
    els.chatMessages.textContent = '';
    els.clearChatBtn.classList.toggle('hidden', state.chatMessages.length === 0);

    if (state.chatMessages.length === 0) {
      var welcome = document.createElement('div');
      welcome.className = 'chat-bubble-ai';
      var wHead = document.createElement('div');
      wHead.className = 'chat-ai-head';
      wHead.textContent = '✨ Payo AI Ready';
      var wBody = document.createElement('p');
      wBody.className = 'chat-ai-advice';
      wBody.textContent =
        'Kamusta? Sabihin mo kahit ano—kahit "sad", "happy", o buong kwento. Pag nag-send ka, may effects agad at ako na ang bahalang magbigay ng payo sa iyo!';
      welcome.appendChild(wHead);
      welcome.appendChild(wBody);
      els.chatMessages.appendChild(welcome);
    }

    state.chatMessages.forEach(function (msg) {
      if (msg.role === 'user') {
        var row = document.createElement('div');
        row.className = 'chat-msg-user-row';
        var ub = document.createElement('div');
        ub.className = 'chat-bubble-user';
        ub.textContent = msg.content;
        row.appendChild(ub);
        els.chatMessages.appendChild(row);
      } else {
        var ab = document.createElement('div');
        ab.className = 'chat-bubble-ai';

        var head = document.createElement('div');
        head.className = 'chat-ai-head';
        head.textContent =
          (msg.adviceData && msg.adviceData.moodEmoji ? msg.adviceData.moodEmoji : '✨') +
          ' Payo AI Advice';
        ab.appendChild(head);

        if (msg.adviceData) {
          if (msg.adviceData.summary) {
            var sum = document.createElement('p');
            sum.className = 'chat-ai-summary';
            sum.textContent = msg.adviceData.summary;
            ab.appendChild(sum);
          }
          var adv = document.createElement('p');
          adv.className = 'chat-ai-advice';
          adv.textContent = msg.adviceData.advice;
          ab.appendChild(adv);

          if (Array.isArray(msg.adviceData.actionSteps) && msg.adviceData.actionSteps.length > 0) {
            var ol = document.createElement('ol');
            ol.className = 'chat-ai-steps';
            msg.adviceData.actionSteps.forEach(function (step) {
              var li = document.createElement('li');
              li.textContent = step;
              ol.appendChild(li);
            });
            ab.appendChild(ol);
          }

          if (msg.adviceData.followUpQuestion) {
            var fq = document.createElement('p');
            fq.className = 'chat-ai-followup';
            fq.textContent = '💬 ' + msg.adviceData.followUpQuestion;
            ab.appendChild(fq);
          }
        } else {
          var p = document.createElement('p');
          p.className = 'chat-ai-advice';
          p.textContent = msg.content;
          ab.appendChild(p);
        }

        els.chatMessages.appendChild(ab);
      }
    });

    if (state.sending) {
      var typing = document.createElement('div');
      typing.className = 'chat-bubble-ai';
      var dots = document.createElement('div');
      dots.className = 'typing-dots';
      dots.appendChild(document.createTextNode('Payo AI is thinking '));
      for (var d = 0; d < 3; d += 1) {
        dots.appendChild(document.createElement('span'));
      }
      typing.appendChild(dots);
      els.chatMessages.appendChild(typing);
    }

    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function buildConfessionListItem(confession) {
    var reactedMap = Store.getReactedMap();
    var activeEmojis = Array.isArray(reactedMap[confession.id])
      ? reactedMap[confession.id]
      : [];
    var saved = Store.isSaved(confession.id);
    var isOwner = Store.isMyPost(confession.id);
    var replies = Array.isArray(confession.replies) ? confession.replies : [];
    var moodMeta = Effects.getMoodMeta(confession.emotion || 'neutral');

    var card = document.createElement('article');
    card.className = 'glass-card list-item-card';

    // Top row
    var meta = document.createElement('div');
    meta.className = 'list-item-meta';

    var left = document.createElement('div');
    left.className = 'toolbar-title-group';
    var moodTag = document.createElement('span');
    moodTag.className = 'mood-pill';
    moodTag.textContent = moodMeta.emoji + ' ' + moodMeta.label;
    var who = document.createElement('span');
    who.textContent = 'Anonymous • ' + Store.formatRelativeTime(confession.created_at);
    left.appendChild(moodTag);
    left.appendChild(who);

    var right = document.createElement('div');
    right.className = 'toolbar-actions';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'icon-btn' + (saved ? ' saved' : '');
    saveBtn.title = saved ? 'Remove bookmark' : 'Save confession';
    saveBtn.textContent = '🔖';
    saveBtn.addEventListener('click', function () {
      var nowSaved = Store.toggleSaved(confession.id);
      updateSavedPill();
      renderWallList(false);
      showToast(nowSaved ? 'Saved!' : 'Removed from saved.');
    });
    right.appendChild(saveBtn);

    if (isOwner) {
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn';
      delBtn.title = 'Delete my post';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', function () {
        if (Store.deleteMyPost(confession.id)) {
          renderWallList(false);
          showToast('Confession removed.');
        }
      });
      right.appendChild(delBtn);
    }

    meta.appendChild(left);
    meta.appendChild(right);
    card.appendChild(meta);

    // Confession text (XSS-safe textContent)
    var body = document.createElement('p');
    body.className = 'list-item-body';
    body.textContent = confession.content;
    card.appendChild(body);

    // Attached AI Advice
    if (confession.ai_advice) {
      var aiBox = document.createElement('div');
      aiBox.className = 'list-item-ai';
      var aiHead = document.createElement('span');
      aiHead.className = 'list-item-ai-label';
      aiHead.textContent = (confession.ai_emoji || '✨') + ' Payo AI Advice';
      var aiText = document.createElement('p');
      aiText.className = 'list-item-ai-text';
      aiText.textContent = confession.ai_advice;
      aiBox.appendChild(aiHead);
      aiBox.appendChild(aiText);
      card.appendChild(aiBox);
    }

    // Bottom actions: Reactions + Replies
    var bottom = document.createElement('div');
    bottom.className = 'card-bottom-row';

    var reactionRow = document.createElement('div');
    reactionRow.className = 'reaction-row';
    Store.REACTION_EMOJIS.forEach(function (emoji) {
      var count = (confession.reactions && confession.reactions[emoji]) || 0;
      var isActive = activeEmojis.indexOf(emoji) !== -1;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'react-btn' + (isActive ? ' active' : '');
      btn.setAttribute('aria-pressed', String(isActive));

      var eSpan = document.createElement('span');
      eSpan.textContent = emoji;
      var cSpan = document.createElement('span');
      cSpan.textContent = String(count);
      btn.appendChild(eSpan);
      btn.appendChild(cSpan);

      btn.addEventListener('click', async function () {
        await Store.toggleReaction(confession.id, emoji);
        renderWallList(false);
      });
      reactionRow.appendChild(btn);
    });

    var replyDrawer = document.createElement('div');
    replyDrawer.className = 'reply-drawer hidden';

    function renderReplies() {
      var latest = Store.getByIdSync(confession.id) || confession;
      var list = Array.isArray(latest.replies) ? latest.replies : [];
      replyDrawer.textContent = '';

      if (list.length === 0) {
        var none = document.createElement('p');
        none.className = 'muted-sub';
        none.textContent = 'No replies yet. Leave an encouraging message below.';
        replyDrawer.appendChild(none);
      } else {
        list.forEach(function (rep) {
          var item = document.createElement('div');
          item.className = 'reply-item';
          var rm = document.createElement('div');
          rm.className = 'reply-meta';
          rm.textContent = 'Anonymous • ' + Store.formatRelativeTime(rep.created_at);
          var rt = document.createElement('p');
          rt.className = 'reply-text';
          rt.textContent = rep.content;
          item.appendChild(rm);
          item.appendChild(rt);
          replyDrawer.appendChild(item);
        });
      }

      var rForm = document.createElement('form');
      rForm.className = 'reply-form';
      var rInput = document.createElement('input');
      rInput.type = 'text';
      rInput.className = 'input';
      rInput.maxLength = 500;
      rInput.placeholder = 'Write an anonymous reply...';
      var rBtn = document.createElement('button');
      rBtn.type = 'submit';
      rBtn.className = 'btn btn-secondary btn-sm';
      rBtn.textContent = 'Reply';
      rForm.appendChild(rInput);
      rForm.appendChild(rBtn);

      rForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var val = rInput.value.trim();
        if (val.length < 2) return;
        var safety = await AI.moderate(val);
        if (!safety.approved) {
          showToast(safety.reason || 'Reply blocked by safety check.');
          return;
        }
        await Store.addReply(confession.id, val);
        rInput.value = '';
        renderReplies();
        var updated = Store.getByIdSync(confession.id);
        replyBtn.textContent =
          '💬 Replies (' + ((updated && updated.replies ? updated.replies.length : 0)) + ')';
      });
      replyDrawer.appendChild(rForm);
    }

    var replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'chip';
    replyBtn.textContent = '💬 Replies (' + replies.length + ')';
    replyBtn.addEventListener('click', function () {
      var open = replyDrawer.classList.contains('hidden');
      replyDrawer.classList.toggle('hidden', !open);
      if (open) renderReplies();
    });

    bottom.appendChild(reactionRow);
    bottom.appendChild(replyBtn);
    card.appendChild(bottom);
    card.appendChild(replyDrawer);
    return card;
  }

  async function renderWallList(fetchRemote) {
    updateSavedPill();
    var opts = {
      q: state.searchQuery,
      emotion: state.filterEmotion,
      savedOnly: state.savedOnly,
      sort: state.sortBy,
      limit: state.visibleLimit,
      offset: 0,
    };

    var result = fetchRemote
      ? await Store.listPublic(opts)
      : Store.listPublicSync(opts);

    if (result.source) {
      updateSyncBadge(result.source);
    }

    els.totalBadge.textContent = String(result.total);
    els.confessionList.textContent = '';

    if (result.confessions.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'glass-card empty-state';
      var h = document.createElement('h3');
      h.className = 'section-heading';
      h.textContent = state.savedOnly
        ? 'No saved confessions yet'
        : 'No matching confessions';
      var p = document.createElement('p');
      p.className = 'muted-sub';
      p.textContent = state.savedOnly
        ? 'Tap 🔖 on any confession to bookmark it here.'
        : 'Type anything in the chat card above and hit Send!';
      empty.appendChild(h);
      empty.appendChild(p);
      els.confessionList.appendChild(empty);
    } else {
      result.confessions.forEach(function (c) {
        els.confessionList.appendChild(buildConfessionListItem(c));
      });
    }

    els.loadMoreWrap.classList.toggle('hidden', !result.hasMore);
  }

  function updateComposerValidation() {
    var raw = els.chatInput.value;
    var trimmed = raw.trim();
    els.charCounter.textContent = raw.length + ' / 1000';
    els.sendBtn.disabled = state.sending || trimmed.length < 2 || raw.length > 1000;
  }

  async function sendChatMessage(overrideText) {
    if (state.sending) return;
    var content = (overrideText !== undefined ? overrideText : els.chatInput.value).trim();
    if (content.length < 2 || content.length > 1000) return;

    var rate = Store.checkPostRateLimit();
    if (!rate.allowed) {
      els.chatError.textContent = 'Rate limit reached (max 15 messages per 15 min). Please wait a moment.';
      els.chatError.classList.remove('hidden');
      return;
    }

    els.chatError.classList.add('hidden');
    var safety = await AI.moderate(content);
    if (!safety.approved) {
      els.chatError.textContent = safety.reason || 'Please keep messages anonymous and safe.';
      els.chatError.classList.remove('hidden');
      return;
    }

    var detectedEmotion = AI.detectEmotion(content);
    Effects.triggerMoodEffect(detectedEmotion, els.chatCard);
    updateLiveMoodPreview(content);

    state.chatMessages.push({
      role: 'user',
      content: content,
      createdAt: new Date().toISOString(),
    });
    if (state.chatMessages.length > 20) {
      state.chatMessages = state.chatMessages.slice(-20);
    }
    Store.saveChatHistory(state.chatMessages);

    els.chatInput.value = '';
    Store.saveDraft('chat', '');
    state.sending = true;
    updateComposerValidation();
    renderChatViewport();

    try {
      // Brief natural typing pause so effects & shimmer feel alive
      await new Promise(function (resolve) {
        setTimeout(resolve, 350);
      });

      var adviceData = await AI.advise(state.chatMessages, 'empathetic');
      var finalEmotion = adviceData.emotion || detectedEmotion;
      Effects.setCardMood(els.chatCard, finalEmotion);

      state.chatMessages.push({
        role: 'assistant',
        content: adviceData.advice,
        createdAt: new Date().toISOString(),
        adviceData: adviceData,
      });
      Store.saveChatHistory(state.chatMessages);

      if (els.sharePublicToggle.checked) {
        await Store.createConfession({
          content: content,
          emotion: finalEmotion,
          ai_emoji: adviceData.moodEmoji || '✨',
          ai_advice: adviceData.advice,
          ai_steps: adviceData.actionSteps || [],
        });
        await renderWallList(false);
        showToast('Sent with AI advice & added to the confessions list!');
      } else {
        showToast('Private AI advice ready!');
      }
    } finally {
      state.sending = false;
      updateComposerValidation();
      renderChatViewport();
    }
  }

  function openSettings() {
    var s = Store.getSettings();
    els.supabaseUrlInput.value = s.supabaseUrl || '';
    els.supabaseKeyInput.value = s.supabaseAnonKey || '';
    els.aiProxyUrlInput.value = s.aiProxyUrl || '';
    els.settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    els.settingsModal.classList.add('hidden');
  }

  function bindEvents() {
    els.chatInput.addEventListener('input', function () {
      els.chatError.classList.add('hidden');
      Store.saveDraft('chat', els.chatInput.value);
      updateLiveMoodPreview(els.chatInput.value);
      updateComposerValidation();
    });

    els.chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });

    els.chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sendChatMessage();
    });

    document.querySelectorAll('.mood-quick').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-text') || '';
        els.chatInput.value = text;
        Store.saveDraft('chat', text);
        updateLiveMoodPreview(text);
        updateComposerValidation();
        Effects.triggerMoodEffect(AI.detectEmotion(text), els.chatCard);
        els.chatInput.focus();
      });
    });

    els.clearChatBtn.addEventListener('click', function () {
      state.chatMessages = [];
      Store.clearChatHistory();
      updateLiveMoodPreview('');
      renderChatViewport();
      showToast('Chat box cleared.');
    });

    els.savedFilterBtn.addEventListener('click', function () {
      state.savedOnly = !state.savedOnly;
      state.visibleLimit = PAGE_SIZE;
      renderWallList(false);
    });

    var searchTimer = null;
    els.searchInput.addEventListener('input', function () {
      var val = els.searchInput.value;
      els.clearSearchBtn.classList.toggle('hidden', !val);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.searchQuery = val;
        state.visibleLimit = PAGE_SIZE;
        renderWallList(false);
      }, 200);
    });

    els.clearSearchBtn.addEventListener('click', function () {
      els.searchInput.value = '';
      els.clearSearchBtn.classList.add('hidden');
      state.searchQuery = '';
      renderWallList(false);
    });

    document.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.seg-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        state.sortBy = btn.getAttribute('data-sort') || 'newest';
        renderWallList(false);
      });
    });

    els.loadMoreBtn.addEventListener('click', function () {
      state.visibleLimit += PAGE_SIZE;
      renderWallList(false);
    });

    els.refreshBtn.addEventListener('click', async function () {
      await renderWallList(true);
      showToast('Confessions list refreshed.');
    });

    els.surpriseBtn.addEventListener('click', function () {
      var pick = Store.getRandomSync();
      if (!pick) {
        showToast('No confessions yet.');
        return;
      }
      Effects.triggerMoodEffect(pick.emotion || 'neutral', els.chatCard);
      els.searchInput.value = pick.content.slice(0, 24);
      state.searchQuery = els.searchInput.value;
      els.clearSearchBtn.classList.remove('hidden');
      renderWallList(false);
      document.getElementById('wallListSection').scrollIntoView({ behavior: 'smooth' });
    });

    els.themeToggleBtn.addEventListener('click', function () {
      var next = Store.getSettings().theme === 'light' ? 'dark' : 'light';
      Store.saveSettings({ theme: next });
      applyTheme(next);
    });

    els.settingsBtn.addEventListener('click', openSettings);
    els.syncStatusPill.addEventListener('click', openSettings);
    els.closeSettingsModal.addEventListener('click', closeSettings);
    els.settingsModal.addEventListener('click', function (e) {
      if (e.target === els.settingsModal) closeSettings();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.settingsModal.classList.contains('hidden')) {
        closeSettings();
      }
    });

    els.resetSettingsBtn.addEventListener('click', async function () {
      Store.saveSettings({ supabaseUrl: '', supabaseAnonKey: '', aiProxyUrl: '' });
      closeSettings();
      await renderWallList(true);
      showToast('Switched to Local Mode.');
    });

    els.settingsForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      Store.saveSettings({
        supabaseUrl: els.supabaseUrlInput.value,
        supabaseAnonKey: els.supabaseKeyInput.value,
        aiProxyUrl: els.aiProxyUrlInput.value,
      });
      closeSettings();
      await renderWallList(true);
      showToast(Store.isSharedMode() ? 'Connected to Shared Wall!' : 'Settings saved.');
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
          closeSettings();
          renderWallList(false);
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
      closeSettings();
      renderWallList(false);
      showToast('Demo confessions restored.');
    });

    window.addEventListener('storage', function () {
      renderWallList(false);
    });

    // Auto-refresh shared wall every 15 seconds when Supabase is connected
    setInterval(function () {
      if (Store.isSharedMode() && !document.hidden) {
        renderWallList(true);
      }
    }, 15000);
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    applyTheme(Store.getSettings().theme);
    state.chatMessages = Store.getChatHistory();
    els.chatInput.value = Store.getDraft('chat');
    updateLiveMoodPreview(els.chatInput.value);
    updateComposerValidation();
    renderEmotionFilterChips();
    renderChatViewport();
    bindEvents();
    renderWallList(true);
  });
})();
