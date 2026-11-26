(function () {
  'use strict';

  var Store = window.ConfessionStore;
  var AI = window.ConfessionAI;

  var PAGE_SIZE = 10;
  var PERSONAS = [
    {
      value: 'empathetic',
      label: '🫂 Warm & Empathetic',
      desc: 'Gentle listener first, soft guidance',
    },
    {
      value: 'taglish_bestie',
      label: '🫶 Taglish Bestie',
      desc: 'Kaibigan vibes, natural Tagalog/English',
    },
    {
      value: 'practical',
      label: '💡 Practical Coach',
      desc: 'Clear perspective + concrete action steps',
    },
    {
      value: 'mentor',
      label: '🌱 Calm Mentor',
      desc: 'Big-picture wisdom & steady clarity',
    },
  ];

  var ADVICE_STARTERS = [
    'Pagod na ako sa work at hindi ko alam kung magre-resign na ba ako o magpapahinga lang muna.',
    'I have feelings for a close friend and I do not know whether to confess or protect our friendship.',
    'Nahihirapan akong mag-focus sa school lately dahil sa family pressure.',
    'I just need to vent about something I cannot tell anyone in real life.',
  ];

  var state = {
    selectedCategory: 'Confession',
    selectedMood: '',
    filterCategory: 'All',
    savedOnly: false,
    sortBy: 'newest',
    searchQuery: '',
    visibleLimit: PAGE_SIZE,
    submitting: false,
    advicePersona: 'empathetic',
    adviceLoading: false,
    adviceMessages: [],
  };

  var els = {};

  function cacheElements() {
    els.permalinkSection = document.getElementById('permalinkSection');
    els.permalinkContainer = document.getElementById('permalinkContainer');
    els.permalinkCopyBtn = document.getElementById('permalinkCopyBtn');
    els.permalinkRandomBtn = document.getElementById('permalinkRandomBtn');
    els.backToWallBtn = document.getElementById('backToWallBtn');
    els.adviceSection = document.getElementById('adviceSection');
    els.adviceBackBtn = document.getElementById('adviceBackBtn');
    els.navAdviceBtn = document.getElementById('navAdviceBtn');
    els.personaGrid = document.getElementById('personaGrid');
    els.adviceStarterBox = document.getElementById('adviceStarterBox');
    els.adviceStarters = document.getElementById('adviceStarters');
    els.adviceThread = document.getElementById('adviceThread');
    els.adviceForm = document.getElementById('adviceForm');
    els.adviceInput = document.getElementById('adviceInput');
    els.adviceCharCounter = document.getElementById('adviceCharCounter');
    els.adviceSubmitBtn = document.getElementById('adviceSubmitBtn');
    els.clearAdviceBtn = document.getElementById('clearAdviceBtn');
    els.shareAdviceToWallBtn = document.getElementById('shareAdviceToWallBtn');
    els.wallSection = document.getElementById('wallSection');
    els.formCategoryChips = document.getElementById('formCategoryChips');
    els.formMoodChips = document.getElementById('formMoodChips');
    els.filterCategoryChips = document.getElementById('filterCategoryChips');
    els.savedFilterBtn = document.getElementById('savedFilterBtn');
    els.confessionForm = document.getElementById('confessionForm');
    els.confessionInput = document.getElementById('confessionInput');
    els.inputError = document.getElementById('inputError');
    els.charCounter = document.getElementById('charCounter');
    els.submitBtn = document.getElementById('submitBtn');
    els.formFeedback = document.getElementById('formFeedback');
    els.totalBadge = document.getElementById('totalBadge');
    els.modeBadge = document.getElementById('modeBadge');
    els.searchInput = document.getElementById('searchInput');
    els.clearSearchBtn = document.getElementById('clearSearchBtn');
    els.confessionList = document.getElementById('confessionList');
    els.loadMoreWrap = document.getElementById('loadMoreWrap');
    els.loadMoreBtn = document.getElementById('loadMoreBtn');
    els.refreshBtn = document.getElementById('refreshBtn');
    els.surpriseBtn = document.getElementById('surpriseBtn');
    els.themeToggleBtn = document.getElementById('themeToggleBtn');
    els.settingsBtn = document.getElementById('settingsBtn');
    els.settingsModal = document.getElementById('settingsModal');
    els.settingsForm = document.getElementById('settingsForm');
    els.aiProxyUrlInput = document.getElementById('aiProxyUrlInput');
    els.closeSettingsModal = document.getElementById('closeSettingsModal');
    els.resetSettingsBtn = document.getElementById('resetSettingsBtn');
    els.exportJsonBtn = document.getElementById('exportJsonBtn');
    els.importJsonInput = document.getElementById('importJsonInput');
    els.resetDemoBtn = document.getElementById('resetDemoBtn');
    els.toast = document.getElementById('toast');
  }

  var toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
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
      els.themeToggleBtn.title =
        mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
    }
  }

  function updateModeBadge() {
    var settings = Store.getSettings();
    els.modeBadge.textContent = settings.aiProxyUrl
      ? '✨ Open Wall • AI Proxy'
      : '✨ Open Wall • Built-in AI';
  }

  function updateSavedPill() {
    var count = Store.getSavedIds().length;
    els.savedFilterBtn.textContent = '🔖 Saved (' + count + ')';
    els.savedFilterBtn.classList.toggle('active', state.savedOnly);
    els.savedFilterBtn.setAttribute('aria-pressed', String(state.savedOnly));
  }

  function renderCategoryChips() {
    els.formCategoryChips.textContent = '';
    Store.CATEGORIES.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (state.selectedCategory === cat ? ' active' : '');
      btn.textContent = '#' + cat;
      btn.addEventListener('click', function () {
        state.selectedCategory = cat;
        renderCategoryChips();
      });
      els.formCategoryChips.appendChild(btn);
    });

    els.formMoodChips.textContent = '';
    Store.MOODS.forEach(function (mood) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (state.selectedMood === mood ? ' active' : '');
      btn.textContent = mood || 'No Mood';
      btn.addEventListener('click', function () {
        state.selectedMood = mood;
        renderCategoryChips();
      });
      els.formMoodChips.appendChild(btn);
    });

    els.filterCategoryChips.textContent = '';
    ['All'].concat(Store.CATEGORIES).forEach(function (cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (state.filterCategory === cat ? ' active' : '');
      btn.textContent = cat === 'All' ? 'All' : '#' + cat;
      btn.addEventListener('click', function () {
        state.filterCategory = cat;
        state.visibleLimit = PAGE_SIZE;
        renderCategoryChips();
        renderWall();
      });
      els.filterCategoryChips.appendChild(btn);
    });
  }

  function renderAdviceResultInto(container, adviceData, showContinueLink, originalText) {
    container.textContent = '';

    var headerRow = document.createElement('div');
    headerRow.className = 'card-header-row';
    var titleSpan = document.createElement('span');
    titleSpan.className = 'ai-label';
    titleSpan.textContent = (adviceData.moodEmoji || '🫂') + ' Payo AI Advice';
    headerRow.appendChild(titleSpan);

    if (showContinueLink) {
      var contBtn = document.createElement('button');
      contBtn.type = 'button';
      contBtn.className = 'icon-btn';
      contBtn.textContent = 'Continue in Private AI Chat →';
      contBtn.addEventListener('click', function () {
        els.adviceInput.value = originalText || '';
        Store.saveDraft('advice', els.adviceInput.value);
        updateAdviceValidation();
        window.location.hash = 'advice';
      });
      headerRow.appendChild(contBtn);
    }
    container.appendChild(headerRow);

    if (adviceData.summary) {
      var sumP = document.createElement('p');
      sumP.className = 'advice-summary';
      sumP.textContent = adviceData.summary;
      container.appendChild(sumP);
    }

    var adviceP = document.createElement('p');
    adviceP.className = 'advice-text';
    adviceP.textContent = adviceData.advice;
    container.appendChild(adviceP);

    if (Array.isArray(adviceData.actionSteps) && adviceData.actionSteps.length > 0) {
      var stepsBox = document.createElement('div');
      stepsBox.className = 'advice-steps-box';
      var stepsTitle = document.createElement('p');
      stepsTitle.className = 'advice-steps-title';
      stepsTitle.textContent = 'Suggested Next Steps';
      var ol = document.createElement('ol');
      ol.className = 'advice-steps-list';
      adviceData.actionSteps.forEach(function (step) {
        var li = document.createElement('li');
        li.textContent = step;
        ol.appendChild(li);
      });
      stepsBox.appendChild(stepsTitle);
      stepsBox.appendChild(ol);
      container.appendChild(stepsBox);
    }

    if (adviceData.followUpQuestion) {
      var fq = document.createElement('p');
      fq.className = 'advice-followup';
      fq.textContent = '💬 ' + adviceData.followUpQuestion;
      container.appendChild(fq);
    }
  }

  function buildConfessionCard(confession, options) {
    var opts = options || {};
    var reactedMap = Store.getReactedMap();
    var activeEmojis = Array.isArray(reactedMap[confession.id])
      ? reactedMap[confession.id]
      : [];
    var saved = Store.isSaved(confession.id);
    var isOwner = Store.isMyPost(confession.id);
    var replies = Array.isArray(confession.replies) ? confession.replies : [];

    var article = document.createElement('article');
    article.className = 'glass-card confession-card';

    var meta = document.createElement('div');
    meta.className = 'card-meta';

    var leftGroup = document.createElement('div');
    leftGroup.className = 'toolbar-title-group';

    var anon = document.createElement('span');
    anon.className = 'anon-tag';
    var dot = document.createElement('span');
    dot.className = 'anon-dot';
    anon.appendChild(dot);
    anon.appendChild(document.createTextNode('Anonymous'));

    var catBadge = document.createElement('span');
    catBadge.className = 'pill-badge';
    catBadge.textContent = '#' + (confession.category || 'Confession');

    leftGroup.appendChild(anon);
    leftGroup.appendChild(catBadge);

    if (confession.mood) {
      var moodBadge = document.createElement('span');
      moodBadge.className = 'mood-pill';
      moodBadge.textContent = confession.mood;
      leftGroup.appendChild(moodBadge);
    }

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-actions';

    var timeEl = document.createElement('time');
    timeEl.dateTime = confession.created_at;
    timeEl.title = new Date(confession.created_at).toLocaleString();
    timeEl.textContent =
      '🕒 ' +
      Store.formatRelativeTime(confession.created_at) +
      (confession.edited_at ? ' (edited)' : '');
    rightGroup.appendChild(timeEl);

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'icon-btn' + (saved ? ' saved' : '');
    saveBtn.title = saved ? 'Remove bookmark' : 'Save confession';
    saveBtn.textContent = '🔖';
    saveBtn.addEventListener('click', function () {
      var nowSaved = Store.toggleSaved(confession.id);
      updateSavedPill();
      renderCurrentRoute();
      showToast(nowSaved ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
    });
    rightGroup.appendChild(saveBtn);

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'icon-btn';
    copyBtn.title = 'Copy permalink';
    copyBtn.textContent = '📋';
    copyBtn.addEventListener('click', function () {
      var url =
        window.location.href.split('#')[0] + '#confession=' + confession.id;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            showToast('Permalink copied to clipboard.');
          },
          function () {
            showToast('Copy failed.');
          }
        );
      } else {
        window.location.hash = 'confession=' + confession.id;
        showToast('Opened permalink in URL.');
      }
    });
    rightGroup.appendChild(copyBtn);

    var bodyContainer = document.createElement('div');
    var body = document.createElement('p');
    body.className = 'confession-body';
    body.textContent = confession.content;
    bodyContainer.appendChild(body);

    if (isOwner) {
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.title = 'Edit my post';
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', function () {
        bodyContainer.textContent = '';
        var editBox = document.createElement('form');
        editBox.className = 'edit-box';

        var ta = document.createElement('textarea');
        ta.className = 'textarea';
        ta.rows = 3;
        ta.maxLength = 1000;
        ta.value = confession.content;

        var actions = document.createElement('div');
        actions.className = 'modal-actions';

        var cancelEdit = document.createElement('button');
        cancelEdit.type = 'button';
        cancelEdit.className = 'btn btn-ghost btn-sm';
        cancelEdit.textContent = 'Cancel';
        cancelEdit.addEventListener('click', function () {
          renderCurrentRoute();
        });

        var saveEdit = document.createElement('button');
        saveEdit.type = 'submit';
        saveEdit.className = 'btn btn-primary btn-sm';
        saveEdit.textContent = 'Save Edit';

        actions.appendChild(cancelEdit);
        actions.appendChild(saveEdit);
        editBox.appendChild(ta);
        editBox.appendChild(actions);

        editBox.addEventListener('submit', async function (ev) {
          ev.preventDefault();
          var nextText = ta.value.trim();
          if (nextText.length < 5) {
            showToast('Confession must be at least 5 characters.');
            return;
          }
          var safety = await AI.moderate(nextText);
          if (!safety.approved) {
            showToast(safety.reason || 'Edit blocked by safety rules.');
            return;
          }
          Store.updateMyPost(confession.id, nextText, confession.category);
          showToast('Confession updated.');
          renderCurrentRoute();
        });

        bodyContainer.appendChild(editBox);
        ta.focus();
      });
      rightGroup.appendChild(editBtn);

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn';
      delBtn.title = 'Delete my post';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', function () {
        if (Store.deleteMyPost(confession.id)) {
          if (getHashConfessionId() === confession.id) {
            window.location.hash = '';
          }
          renderCurrentRoute();
          showToast('Your confession was removed.');
        }
      });
      rightGroup.appendChild(delBtn);
    }

    if (opts.showPermalink !== false) {
      var link = document.createElement('a');
      link.href = '#confession=' + confession.id;
      link.className = 'icon-btn';
      link.title = 'Open permalink';
      link.textContent = '↗';
      rightGroup.appendChild(link);
    }

    meta.appendChild(leftGroup);
    meta.appendChild(rightGroup);
    article.appendChild(meta);
    article.appendChild(bodyContainer);

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
        var commentP = document.createElement('p');
        commentP.className = 'ai-comment';
        commentP.textContent = confession.ai_comment;
        textBox.appendChild(commentP);
      }

      bubble.appendChild(emojiBox);
      bubble.appendChild(textBox);
      article.appendChild(bubble);
    }

    var bottomRow = document.createElement('div');
    bottomRow.className = 'card-bottom-row';

    var reactionRow = document.createElement('div');
    reactionRow.className = 'reaction-row';

    Store.REACTION_EMOJIS.forEach(function (emoji) {
      var count = (confession.reactions && confession.reactions[emoji]) || 0;
      var isActive = activeEmojis.indexOf(emoji) !== -1;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'react-btn' + (isActive ? ' active' : '');
      btn.setAttribute('aria-pressed', String(isActive));

      var emojiSpan = document.createElement('span');
      emojiSpan.textContent = emoji;
      var countSpan = document.createElement('span');
      countSpan.textContent = String(count);

      btn.appendChild(emojiSpan);
      btn.appendChild(countSpan);

      btn.addEventListener('click', function () {
        Store.toggleReaction(confession.id, emoji);
        renderCurrentRoute();
      });

      reactionRow.appendChild(btn);
    });

    var actionGroup = document.createElement('div');
    actionGroup.className = 'card-action-group';

    // Human Replies Drawer
    var replyDrawer = document.createElement('div');
    replyDrawer.className = 'reply-drawer hidden';

    function renderRepliesIntoDrawer() {
      var latest = Store.getById(confession.id) || confession;
      var currentReplies = Array.isArray(latest.replies) ? latest.replies : [];
      replyDrawer.textContent = '';

      var listEl = document.createElement('div');
      listEl.className = 'reply-list';

      if (currentReplies.length === 0) {
        var none = document.createElement('p');
        none.className = 'muted-sub';
        none.textContent = 'No anonymous replies yet. Leave a kind word below.';
        listEl.appendChild(none);
      } else {
        currentReplies.forEach(function (rep) {
          var item = document.createElement('div');
          item.className = 'reply-item';

          var rMeta = document.createElement('div');
          rMeta.className = 'reply-meta';
          var rTime = document.createElement('span');
          rTime.textContent = 'Anonymous • ' + Store.formatRelativeTime(rep.created_at);
          rMeta.appendChild(rTime);

          if (Store.isMyReply(rep.id)) {
            var rDel = document.createElement('button');
            rDel.type = 'button';
            rDel.className = 'icon-btn';
            rDel.title = 'Delete my reply';
            rDel.textContent = '🗑';
            rDel.addEventListener('click', function () {
              Store.deleteMyReply(confession.id, rep.id);
              renderRepliesIntoDrawer();
              replyBtn.textContent =
                '💬 Replies (' +
                ((Store.getById(confession.id) || { replies: [] }).replies || []).length +
                ')';
            });
            rMeta.appendChild(rDel);
          }

          var rText = document.createElement('p');
          rText.className = 'reply-text';
          rText.textContent = rep.content;

          item.appendChild(rMeta);
          item.appendChild(rText);
          listEl.appendChild(item);
        });
      }

      var rForm = document.createElement('form');
      rForm.className = 'reply-form';
      var rInput = document.createElement('input');
      rInput.type = 'text';
      rInput.className = 'input';
      rInput.maxLength = 500;
      rInput.placeholder = 'Write an anonymous reply...';
      var rSubmit = document.createElement('button');
      rSubmit.type = 'submit';
      rSubmit.className = 'btn btn-secondary btn-sm';
      rSubmit.textContent = 'Reply';

      rForm.appendChild(rInput);
      rForm.appendChild(rSubmit);

      rForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var text = rInput.value.trim();
        if (text.length < 2) return;
        var safety = await AI.moderate(text);
        if (!safety.approved) {
          showToast(safety.reason || 'Reply blocked by safety rules.');
          return;
        }
        Store.addReply(confession.id, text);
        rInput.value = '';
        renderRepliesIntoDrawer();
        var updatedCount = (
          (Store.getById(confession.id) || { replies: [] }).replies || []
        ).length;
        replyBtn.textContent = '💬 Replies (' + updatedCount + ')';
      });

      replyDrawer.appendChild(listEl);
      replyDrawer.appendChild(rForm);
    }

    var replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'chip';
    replyBtn.textContent = '💬 Replies (' + replies.length + ')';
    replyBtn.addEventListener('click', function () {
      var willOpen = replyDrawer.classList.contains('hidden');
      replyDrawer.classList.toggle('hidden', !willOpen);
      if (willOpen) {
        renderRepliesIntoDrawer();
      }
    });

    // AI Advice Drawer
    var adviceDrawer = document.createElement('div');
    adviceDrawer.className = 'advice-drawer hidden';
    var adviceLoaded = false;

    var adviceBtn = document.createElement('button');
    adviceBtn.type = 'button';
    adviceBtn.className = 'advice-pill-btn';
    adviceBtn.textContent = '💡 Get AI Advice';
    adviceBtn.addEventListener('click', async function () {
      var isOpen = !adviceDrawer.classList.contains('hidden');
      if (isOpen && adviceLoaded) {
        adviceDrawer.classList.add('hidden');
        adviceBtn.textContent = '💡 Get AI Advice';
        return;
      }

      adviceDrawer.classList.remove('hidden');
      adviceBtn.textContent = '💡 Hide AI Advice';
      if (adviceLoaded) return;

      adviceDrawer.textContent = '⏳ Thinking of helpful advice...';
      var result = await AI.advise(
        [{ role: 'user', content: confession.content }],
        'empathetic'
      );
      adviceLoaded = true;
      renderAdviceResultInto(adviceDrawer, result, true, confession.content);
    });

    actionGroup.appendChild(replyBtn);
    actionGroup.appendChild(adviceBtn);

    bottomRow.appendChild(reactionRow);
    bottomRow.appendChild(actionGroup);
    article.appendChild(bottomRow);
    article.appendChild(replyDrawer);
    article.appendChild(adviceDrawer);
    return article;
  }

  function renderWall() {
    updateSavedPill();
    var result = Store.listPublic({
      q: state.searchQuery,
      category: state.filterCategory,
      savedOnly: state.savedOnly,
      sort: state.sortBy,
      limit: state.visibleLimit,
      offset: 0,
    });

    els.totalBadge.textContent = String(result.total);
    els.confessionList.textContent = '';

    if (result.confessions.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'glass-card empty-state';
      var title = document.createElement('h3');
      title.className = 'section-heading';
      title.textContent = state.savedOnly
        ? 'No saved confessions yet'
        : 'No matching confessions';
      var sub = document.createElement('p');
      sub.className = 'muted-sub';
      sub.textContent = state.savedOnly
        ? 'Click the 🔖 icon on any confession to save it here.'
        : 'Try clearing your filter or be the first to post above.';
      empty.appendChild(title);
      empty.appendChild(sub);
      els.confessionList.appendChild(empty);
    } else {
      result.confessions.forEach(function (confession) {
        els.confessionList.appendChild(
          buildConfessionCard(confession, { showPermalink: true })
        );
      });
    }

    els.loadMoreWrap.classList.toggle('hidden', !result.hasMore);
  }

  function renderPermalink(id) {
    var confession = Store.getById(id);
    els.permalinkContainer.textContent = '';

    if (!confession) {
      var box = document.createElement('div');
      box.className = 'glass-card empty-state';
      var msg = document.createElement('p');
      msg.className = 'alert alert-error';
      msg.textContent = 'This confession was not found.';
      box.appendChild(msg);
      els.permalinkContainer.appendChild(box);
      return;
    }

    els.permalinkContainer.appendChild(
      buildConfessionCard(confession, { showPermalink: false })
    );
  }

  function renderAdviceView() {
    els.personaGrid.textContent = '';
    PERSONAS.forEach(function (p) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className =
        'persona-card' + (state.advicePersona === p.value ? ' active' : '');
      var title = document.createElement('div');
      title.className = 'persona-title';
      title.textContent = p.label;
      var desc = document.createElement('div');
      desc.className = 'persona-desc';
      desc.textContent = p.desc;
      card.appendChild(title);
      card.appendChild(desc);
      card.addEventListener('click', function () {
        state.advicePersona = p.value;
        renderAdviceView();
      });
      els.personaGrid.appendChild(card);
    });

    els.adviceStarters.textContent = '';
    ADVICE_STARTERS.forEach(function (prompt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prompt-chip';
      btn.textContent = '“' + prompt + '”';
      btn.addEventListener('click', function () {
        els.adviceInput.value = prompt;
        Store.saveDraft('advice', prompt);
        updateAdviceValidation();
        els.adviceInput.focus();
      });
      els.adviceStarters.appendChild(btn);
    });

    var hasMessages = state.adviceMessages.length > 0;
    els.adviceStarterBox.classList.toggle('hidden', hasMessages);
    els.clearAdviceBtn.classList.toggle('hidden', !hasMessages);
    els.shareAdviceToWallBtn.classList.toggle(
      'hidden',
      !state.adviceMessages.some(function (m) {
        return m.role === 'user';
      })
    );

    els.adviceThread.textContent = '';
    state.adviceMessages.forEach(function (msg) {
      if (msg.role === 'user') {
        var row = document.createElement('div');
        row.className = 'chat-row-user';
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble-user';
        bubble.textContent = msg.content;
        row.appendChild(bubble);
        els.adviceThread.appendChild(row);
      } else {
        var card = document.createElement('div');
        card.className = 'glass-card advice-card';
        if (msg.adviceData) {
          renderAdviceResultInto(card, msg.adviceData, false);
        } else {
          var p = document.createElement('p');
          p.className = 'advice-text';
          p.textContent = msg.content;
          card.appendChild(p);
        }
        els.adviceThread.appendChild(card);
      }
    });

    if (state.adviceLoading) {
      var thinking = document.createElement('div');
      thinking.className = 'glass-card form-card muted-sub';
      thinking.textContent = '✨ Payo AI is reading carefully and preparing advice...';
      els.adviceThread.appendChild(thinking);
    }
  }

  function updateAdviceValidation() {
    var raw = els.adviceInput.value;
    var len = raw.length;
    els.adviceCharCounter.textContent = len + ' / 3000';
    els.adviceSubmitBtn.disabled =
      state.adviceLoading || raw.trim().length === 0 || len > 3000;
  }

  async function handleAdviceSubmit(e) {
    e.preventDefault();
    if (state.adviceLoading) return;
    var text = els.adviceInput.value.trim();
    if (!text || text.length > 3000) return;

    state.adviceMessages.push({
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    });
    if (state.adviceMessages.length > 20) {
      state.adviceMessages = state.adviceMessages.slice(-20);
    }
    Store.saveAdviceHistory(state.adviceMessages);
    els.adviceInput.value = '';
    Store.saveDraft('advice', '');
    state.adviceLoading = true;
    updateAdviceValidation();
    renderAdviceView();

    try {
      var adviceData = await AI.advise(state.adviceMessages, state.advicePersona);
      state.adviceMessages.push({
        role: 'assistant',
        content: [adviceData.summary, adviceData.advice, adviceData.followUpQuestion]
          .filter(Boolean)
          .join('\n\n'),
        createdAt: new Date().toISOString(),
        adviceData: adviceData,
      });
      Store.saveAdviceHistory(state.adviceMessages);
    } finally {
      state.adviceLoading = false;
      updateAdviceValidation();
      renderAdviceView();
      if (els.adviceThread.lastElementChild) {
        els.adviceThread.lastElementChild.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }

  function getHashConfessionId() {
    var match = window.location.hash.match(/^#confession=([a-zA-Z0-9-]+)$/);
    return match ? match[1] : null;
  }

  function renderCurrentRoute() {
    var hash = window.location.hash;
    var id = getHashConfessionId();

    els.wallSection.classList.add('hidden');
    els.permalinkSection.classList.add('hidden');
    els.adviceSection.classList.add('hidden');

    if (hash === '#advice') {
      els.adviceSection.classList.remove('hidden');
      renderAdviceView();
      updateAdviceValidation();
    } else if (id) {
      els.permalinkSection.classList.remove('hidden');
      renderPermalink(id);
    } else {
      els.wallSection.classList.remove('hidden');
      renderWall();
    }
  }

  function updateFormValidation() {
    var raw = els.confessionInput.value;
    var trimmedLen = raw.trim().length;
    var len = raw.length;

    els.charCounter.textContent = len + ' / 1000';
    els.charCounter.className = 'char-counter';
    if (len > 1000) {
      els.charCounter.classList.add('over');
    } else if (len > 900) {
      els.charCounter.classList.add('warn');
    }

    var errorText = '';
    if (len > 1000) {
      errorText = 'Please keep your confession under 1000 characters.';
    } else if (trimmedLen > 0 && trimmedLen < 5) {
      errorText = 'Write at least 5 characters.';
    }

    if (errorText) {
      els.inputError.textContent = errorText;
      els.inputError.classList.remove('hidden');
      els.confessionInput.classList.add('invalid');
    } else {
      els.inputError.classList.add('hidden');
      els.confessionInput.classList.remove('invalid');
    }

    els.submitBtn.disabled = state.submitting || trimmedLen < 5 || len > 1000;
  }

  function showFormFeedback(type, message) {
    els.formFeedback.className = 'alert alert-' + type;
    els.formFeedback.textContent = message;
    els.formFeedback.classList.remove('hidden');
  }

  async function handleConfessionSubmit(e) {
    e.preventDefault();
    if (state.submitting) return;

    var content = els.confessionInput.value.trim();
    if (content.length < 5 || els.confessionInput.value.length > 1000) return;

    var rate = Store.checkPostRateLimit();
    if (!rate.allowed) {
      showFormFeedback('error', 'Rate limit reached (max 10 posts per 15 minutes). Please wait.');
      return;
    }

    state.submitting = true;
    els.submitBtn.textContent = '⏳ Posting...';
    updateFormValidation();
    els.formFeedback.classList.add('hidden');

    try {
      var safety = await AI.moderate(content);
      if (!safety.approved) {
        showFormFeedback(
          'error',
          safety.reason || 'Please avoid personal contact details, spam links, or harmful threats.'
        );
        return;
      }

      var aiReaction = await AI.react(content, state.selectedCategory);

      Store.createConfession({
        content: content,
        category: state.selectedCategory,
        mood: state.selectedMood,
        ai_emoji: aiReaction.emoji,
        ai_comment: aiReaction.comment,
      });

      els.confessionInput.value = '';
      Store.saveDraft('confession', '');
      showFormFeedback('success', 'Confession posted anonymously to the wall!');
      renderWall();
    } finally {
      state.submitting = false;
      els.submitBtn.textContent = '✉️ Post Anonymously';
      updateFormValidation();
    }
  }

  function openRandomConfession() {
    var pick = Store.getRandom();
    if (!pick) {
      showToast('No confessions available yet.');
      return;
    }
    window.location.hash = 'confession=' + pick.id;
  }

  function closeSettings() {
    els.settingsModal.classList.add('hidden');
  }

  function bindEvents() {
    els.confessionInput.addEventListener('input', function () {
      els.formFeedback.classList.add('hidden');
      Store.saveDraft('confession', els.confessionInput.value);
      updateFormValidation();
    });

    els.confessionInput.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleConfessionSubmit(e);
      }
    });

    els.confessionForm.addEventListener('submit', handleConfessionSubmit);

    els.adviceInput.addEventListener('input', function () {
      Store.saveDraft('advice', els.adviceInput.value);
      updateAdviceValidation();
    });

    els.adviceInput.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleAdviceSubmit(e);
      }
    });

    els.adviceForm.addEventListener('submit', handleAdviceSubmit);

    els.clearAdviceBtn.addEventListener('click', function () {
      state.adviceMessages = [];
      Store.clearAdviceHistory();
      renderAdviceView();
      showToast('Started a fresh private advice session.');
    });

    els.shareAdviceToWallBtn.addEventListener('click', async function () {
      var lastUser = null;
      for (var i = state.adviceMessages.length - 1; i >= 0; i -= 1) {
        if (state.adviceMessages[i].role === 'user') {
          lastUser = state.adviceMessages[i].content;
          break;
        }
      }
      if (!lastUser) return;
      var snippet = lastUser.slice(0, 990);
      var safety = await AI.moderate(snippet);
      if (!safety.approved) {
        showToast(safety.reason || 'Cannot share due to safety guidelines.');
        return;
      }
      var reaction = await AI.react(snippet, 'Vent');
      Store.createConfession({
        content: snippet,
        category: 'Vent',
        ai_emoji: reaction.emoji || null,
        ai_comment: reaction.comment || null,
      });
      showToast('Shared anonymously to the public Confession Wall!');
    });

    els.savedFilterBtn.addEventListener('click', function () {
      state.savedOnly = !state.savedOnly;
      state.visibleLimit = PAGE_SIZE;
      renderWall();
    });

    els.themeToggleBtn.addEventListener('click', function () {
      var current = Store.getSettings().theme;
      var next = current === 'light' ? 'dark' : 'light';
      Store.saveSettings({ theme: next });
      applyTheme(next);
    });

    var searchDebounce = null;
    els.searchInput.addEventListener('input', function () {
      var val = els.searchInput.value;
      els.clearSearchBtn.classList.toggle('hidden', !val);
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(function () {
        state.searchQuery = val;
        state.visibleLimit = PAGE_SIZE;
        renderWall();
      }, 200);
    });

    els.clearSearchBtn.addEventListener('click', function () {
      els.searchInput.value = '';
      els.clearSearchBtn.classList.add('hidden');
      state.searchQuery = '';
      renderWall();
    });

    document.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.seg-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        state.sortBy = btn.getAttribute('data-sort') || 'newest';
        renderWall();
      });
    });

    els.loadMoreBtn.addEventListener('click', function () {
      state.visibleLimit += PAGE_SIZE;
      renderWall();
    });

    els.refreshBtn.addEventListener('click', function () {
      renderWall();
      showToast('Wall refreshed.');
    });

    els.surpriseBtn.addEventListener('click', openRandomConfession);
    els.permalinkRandomBtn.addEventListener('click', openRandomConfession);

    els.backToWallBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.hash = '';
      renderCurrentRoute();
    });

    els.adviceBackBtn.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.hash = '';
      renderCurrentRoute();
    });

    els.permalinkCopyBtn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(function () {
          showToast('Link copied to clipboard.');
        });
      }
    });

    els.settingsBtn.addEventListener('click', function () {
      els.aiProxyUrlInput.value = Store.getSettings().aiProxyUrl || '';
      els.settingsModal.classList.remove('hidden');
    });

    els.closeSettingsModal.addEventListener('click', closeSettings);
    els.settingsModal.addEventListener('click', function (e) {
      if (e.target === els.settingsModal) {
        closeSettings();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.settingsModal.classList.contains('hidden')) {
        closeSettings();
      }
    });

    els.resetSettingsBtn.addEventListener('click', function () {
      Store.saveSettings({ aiProxyUrl: '' });
      els.aiProxyUrlInput.value = '';
      updateModeBadge();
      closeSettings();
      showToast('Switched to built-in browser AI.');
    });

    els.settingsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      Store.saveSettings({ aiProxyUrl: els.aiProxyUrlInput.value });
      updateModeBadge();
      closeSettings();
      showToast('Settings saved.');
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
          renderCurrentRoute();
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
      renderCurrentRoute();
      showToast('Demo confessions restored.');
    });

    window.addEventListener('hashchange', renderCurrentRoute);
    window.addEventListener('storage', function () {
      renderCurrentRoute();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    applyTheme(Store.getSettings().theme);
    state.adviceMessages = Store.getAdviceHistory();
    els.confessionInput.value = Store.getDraft('confession');
    els.adviceInput.value = Store.getDraft('advice');
    updateModeBadge();
    renderCategoryChips();
    updateFormValidation();
    updateAdviceValidation();
    bindEvents();
    renderCurrentRoute();
  });
})();
