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
    filterCategory: 'All',
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
    els.filterCategoryChips = document.getElementById('filterCategoryChips');
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
    els.settingsBtn = document.getElementById('settingsBtn');
    els.reportModal = document.getElementById('reportModal');
    els.reportForm = document.getElementById('reportForm');
    els.reportConfessionId = document.getElementById('reportConfessionId');
    els.reportReasonInput = document.getElementById('reportReasonInput');
    els.reportError = document.getElementById('reportError');
    els.closeReportModal = document.getElementById('closeReportModal');
    els.cancelReportBtn = document.getElementById('cancelReportBtn');
    els.settingsModal = document.getElementById('settingsModal');
    els.settingsForm = document.getElementById('settingsForm');
    els.aiProxyUrlInput = document.getElementById('aiProxyUrlInput');
    els.closeSettingsModal = document.getElementById('closeSettingsModal');
    els.resetSettingsBtn = document.getElementById('resetSettingsBtn');
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

  function updateModeBadge() {
    var settings = Store.getSettings();
    els.modeBadge.textContent = settings.aiProxyUrl
      ? '✨ AI Proxy • Local Storage'
      : '✨ Built-in AI • Local Storage';
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

    var rightGroup = document.createElement('div');
    rightGroup.className = 'toolbar-actions';

    var timeEl = document.createElement('time');
    timeEl.dateTime = confession.created_at;
    timeEl.title = new Date(confession.created_at).toLocaleString();
    timeEl.textContent = '🕒 ' + Store.formatRelativeTime(confession.created_at);
    rightGroup.appendChild(timeEl);

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

    var reportBtn = document.createElement('button');
    reportBtn.type = 'button';
    reportBtn.className = 'icon-btn';
    reportBtn.title = 'Report confession';
    reportBtn.textContent = '🚩';
    reportBtn.addEventListener('click', function () {
      openReportModal(confession.id);
    });
    rightGroup.appendChild(reportBtn);

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

    var body = document.createElement('p');
    body.className = 'confession-body';
    body.textContent = confession.content;
    article.appendChild(body);

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

    bottomRow.appendChild(reactionRow);
    bottomRow.appendChild(adviceBtn);
    article.appendChild(bottomRow);
    article.appendChild(adviceDrawer);
    return article;
  }

  function renderWall() {
    var result = Store.listPublic({
      q: state.searchQuery,
      category: state.filterCategory,
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
      title.textContent = 'No matching confessions';
      var sub = document.createElement('p');
      sub.className = 'muted-sub';
      sub.textContent = 'Try clearing your filter or be the first to post above.';
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
      msg.textContent = 'This confession was not found or is awaiting moderation.';
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
      showFormFeedback('error', 'Rate limit reached (max 5 posts per 15 minutes). Please wait.');
      return;
    }

    state.submitting = true;
    els.submitBtn.textContent = '⏳ Moderating & Posting...';
    updateFormValidation();
    els.formFeedback.classList.add('hidden');

    try {
      var moderation = await AI.moderate(content);
      var status = 'approved';
      if (moderation.flagged) {
        status = 'flagged';
      } else if (!moderation.approved) {
        status = 'rejected';
      }

      var aiReaction =
        status === 'approved'
          ? await AI.react(content, state.selectedCategory)
          : { emoji: null, comment: null };

      Store.createConfession({
        content: content,
        category: state.selectedCategory,
        status: status,
        ai_emoji: aiReaction.emoji,
        ai_comment: aiReaction.comment,
        moderation_reason: moderation.reason || null,
      });

      if (status === 'rejected') {
        showFormFeedback(
          'error',
          moderation.reason || 'Your confession was declined by moderation.'
        );
      } else {
        els.confessionInput.value = '';
        if (status === 'flagged') {
          showFormFeedback(
            'warning',
            moderation.reason || 'Flagged for human admin review.'
          );
        } else {
          showFormFeedback(
            'success',
            'Confession posted anonymously to the wall!'
          );
          renderWall();
        }
      }
    } finally {
      state.submitting = false;
      els.submitBtn.textContent = '✉️ Post Anonymously';
      updateFormValidation();
    }
  }

  function openReportModal(id) {
    els.reportConfessionId.value = id;
    els.reportReasonInput.value = '';
    els.reportError.classList.add('hidden');
    els.reportModal.classList.remove('hidden');
    els.reportReasonInput.focus();
  }

  function closeReportModal() {
    els.reportModal.classList.add('hidden');
  }

  function openRandomConfession() {
    var pick = Store.getRandom();
    if (!pick) {
      showToast('No approved confessions available yet.');
      return;
    }
    window.location.hash = 'confession=' + pick.id;
  }

  function bindEvents() {
    els.confessionInput.addEventListener('input', function () {
      els.formFeedback.classList.add('hidden');
      updateFormValidation();
    });

    els.confessionForm.addEventListener('submit', handleConfessionSubmit);

    els.adviceInput.addEventListener('input', updateAdviceValidation);
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
      var mod = await AI.moderate(snippet);
      if (!mod.approved && !mod.flagged) {
        showToast(mod.reason || 'Cannot share due to moderation guidelines.');
        return;
      }
      var status = mod.flagged ? 'flagged' : 'approved';
      var reaction = status === 'approved' ? await AI.react(snippet, 'Vent') : {};
      Store.createConfession({
        content: snippet,
        category: 'Vent',
        status: status,
        ai_emoji: reaction.emoji || null,
        ai_comment: reaction.comment || null,
        moderation_reason: mod.reason || null,
      });
      showToast(
        status === 'flagged'
          ? 'Shared anonymously & queued for admin review.'
          : 'Shared anonymously to the public Confession Wall!'
      );
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

    els.closeReportModal.addEventListener('click', closeReportModal);
    els.cancelReportBtn.addEventListener('click', closeReportModal);
    els.reportForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = els.reportConfessionId.value;
      var reason = els.reportReasonInput.value.trim();
      if (reason.length < 5) {
        els.reportError.textContent = 'Please provide at least 5 characters.';
        els.reportError.classList.remove('hidden');
        return;
      }
      Store.reportConfession(id, reason);
      closeReportModal();
      if (getHashConfessionId() === id) {
        window.location.hash = '';
      }
      renderCurrentRoute();
      showToast('Confession flagged for admin review.');
    });

    els.settingsBtn.addEventListener('click', function () {
      els.aiProxyUrlInput.value = Store.getSettings().aiProxyUrl || '';
      els.settingsModal.classList.remove('hidden');
    });

    els.closeSettingsModal.addEventListener('click', function () {
      els.settingsModal.classList.add('hidden');
    });

    els.resetSettingsBtn.addEventListener('click', function () {
      Store.saveSettings({ aiProxyUrl: '' });
      els.aiProxyUrlInput.value = '';
      updateModeBadge();
      els.settingsModal.classList.add('hidden');
      showToast('Switched to built-in browser AI.');
    });

    els.settingsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      Store.saveSettings({ aiProxyUrl: els.aiProxyUrlInput.value });
      updateModeBadge();
      els.settingsModal.classList.add('hidden');
      showToast('Settings saved.');
    });

    window.addEventListener('hashchange', renderCurrentRoute);
    window.addEventListener('storage', function () {
      renderCurrentRoute();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    state.adviceMessages = Store.getAdviceHistory();
    updateModeBadge();
    renderCategoryChips();
    updateFormValidation();
    updateAdviceValidation();
    bindEvents();
    renderCurrentRoute();
  });
})();
