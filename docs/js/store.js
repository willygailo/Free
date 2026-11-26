(function (root) {
  'use strict';

  var STORAGE_KEYS = {
    confessions: 'cw_vanilla_confessions_v2',
    reacted: 'cw_vanilla_reacted_v1',
    saved: 'cw_vanilla_saved_v1',
    myPosts: 'cw_vanilla_my_posts_v1',
    myReplies: 'cw_vanilla_my_replies_v1',
    rateLimit: 'cw_vanilla_ratelimit_v1',
    settings: 'cw_vanilla_settings_v2',
    chatHistory: 'cw_vanilla_chat_v2',
    draftPrefix: 'cw_vanilla_draft_',
  };

  var REACTION_EMOJIS = ['❤️', '😂', '😢', '😮'];

  var EMOTION_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'happy', label: '😊 Happy' },
    { key: 'sad', label: '🌧️ Sad' },
    { key: 'love', label: '💖 Love' },
    { key: 'angry', label: '😤 Stressed' },
    { key: 'anxious', label: '🌊 Anxious' },
    { key: 'tired', label: '🌙 Tired' },
  ];

  var memoryFallback = {};

  function getStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (_) {
      // Fall back to memory
    }
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(memoryFallback, k)
          ? memoryFallback[k]
          : null;
      },
      setItem: function (k, v) {
        memoryFallback[k] = String(v);
      },
      removeItem: function (k) {
        delete memoryFallback[k];
      },
    };
  }

  function readJson(key, fallback) {
    try {
      var raw = getStorage().getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    getStorage().setItem(key, JSON.stringify(value));
  }

  function emptyReactions() {
    return { '❤️': 0, '😂': 0, '😢': 0, '😮': 0 };
  }

  function generateUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function buildSeedConfessions() {
    var now = Date.now();
    return [
      {
        id: '11111111-1111-4111-8111-111111111111',
        content:
          'Super happy today! After months of doubting myself, I finally passed my interview and treated myself to iced coffee.',
        emotion: 'happy',
        ai_emoji: '🎉',
        ai_advice:
          'You earned this win—take a moment to soak in how far you have come and remember this feeling whenever doubt creeps back in.',
        ai_steps: [
          'Write down what worked well so you can trust yourself next time.',
          'Celebrate tonight without downplaying your effort.',
        ],
        created_at: new Date(now - 1000 * 60 * 25).toISOString(),
        reactions: { '❤️': 24, '😂': 2, '😢': 0, '😮': 5 },
        replies: [
          {
            id: 'aaaa1111-1111-4111-8111-111111111111',
            content: 'Congrats!! Deserve mo yang iced coffee!',
            created_at: new Date(now - 1000 * 60 * 12).toISOString(),
          },
        ],
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        content:
          'Medyo malungkot ako tonight. Parang lahat ng kaibigan ko busy na sa sarili nilang buhay at nahihiya akong mag-message.',
        emotion: 'sad',
        ai_emoji: '🫂',
        ai_advice:
          'Valid ang lungkot mo—hindi ibig sabihin na busy sila ay nakalimutan ka na nila. Kadalasan naghihintay lang din sila ng simpleng "kamusta" mula sa isang kaibigan.',
        ai_steps: [
          'Mag-send ng simpleng "Hey, thinking of you!" sa isang kaibigan nang walang pressure.',
          'Magpahinga muna nang maaga at bigyan ng gentleness ang sarili mo tonight.',
        ],
        created_at: new Date(now - 1000 * 60 * 80).toISOString(),
        reactions: { '❤️': 19, '😂': 0, '😢': 9, '😮': 1 },
        replies: [],
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        content:
          'I learned how to bake sourdough just so I would have an excuse to bring extra loaves to my crush next door.',
        emotion: 'love',
        ai_emoji: '🫶',
        ai_advice:
          'Using fresh bread as a quiet sign of affection is genuinely heartwarming. When the moment feels right, let your warmth speak a little more openly.',
        ai_steps: [
          'Add a small friendly note next time you share a loaf.',
          'Enjoy the slow, honest build-up without overthinking.',
        ],
        created_at: new Date(now - 1000 * 60 * 185).toISOString(),
        reactions: { '❤️': 33, '😂': 11, '😢': 0, '😮': 6 },
        replies: [],
      },
    ];
  }

  function getSettings() {
    var base = root.CONFESSION_CONFIG || {};
    var saved = readJson(STORAGE_KEYS.settings, {});
    return {
      supabaseUrl: (saved.supabaseUrl || base.supabaseUrl || '').trim().replace(/\/+$/, ''),
      supabaseAnonKey: (saved.supabaseAnonKey || base.supabaseAnonKey || '').trim(),
      aiProxyUrl: (saved.aiProxyUrl || base.aiProxyUrl || '').trim().replace(/\/+$/, ''),
      theme: saved.theme === 'light' ? 'light' : 'dark',
    };
  }

  function saveSettings(partial) {
    var current = getSettings();
    var next = Object.assign({}, current, partial || {});
    next.supabaseUrl = (next.supabaseUrl || '').trim().replace(/\/+$/, '');
    next.supabaseAnonKey = (next.supabaseAnonKey || '').trim();
    next.aiProxyUrl = (next.aiProxyUrl || '').trim().replace(/\/+$/, '');
    next.theme = next.theme === 'light' ? 'light' : 'dark';
    writeJson(STORAGE_KEYS.settings, next);
    return next;
  }

  function isSharedMode() {
    var s = getSettings();
    return Boolean(
      s.supabaseUrl &&
        s.supabaseAnonKey &&
        s.supabaseUrl.indexOf('your-project') === -1 &&
        s.supabaseAnonKey.indexOf('placeholder') === -1
    );
  }

  function supabaseHeaders() {
    var s = getSettings();
    return {
      'Content-Type': 'application/json',
      apikey: s.supabaseAnonKey,
      Authorization: 'Bearer ' + s.supabaseAnonKey,
    };
  }

  function normalizeRow(row) {
    return {
      id: String(row.id),
      content: String(row.content || ''),
      emotion: String(row.emotion || 'neutral'),
      ai_emoji: row.ai_emoji || '✨',
      ai_advice: row.ai_advice || row.ai_comment || '',
      ai_steps: Array.isArray(row.ai_steps) ? row.ai_steps : [],
      created_at: row.created_at || new Date().toISOString(),
      edited_at: row.edited_at || null,
      reactions: Object.assign({}, emptyReactions(), row.reactions || {}),
      replies: Array.isArray(row.replies) ? row.replies : [],
    };
  }

  function loadLocalAll() {
    var list = readJson(STORAGE_KEYS.confessions, null);
    if (Array.isArray(list)) return list.map(normalizeRow);
    var seeded = buildSeedConfessions();
    writeJson(STORAGE_KEYS.confessions, seeded);
    return seeded;
  }

  function saveLocalAll(list) {
    writeJson(STORAGE_KEYS.confessions, list);
  }

  function reactionScore(reactions) {
    return REACTION_EMOJIS.reduce(function (sum, emoji) {
      return sum + ((reactions && reactions[emoji]) || 0);
    }, 0);
  }

  function filterAndSort(all, opts) {
    var options = opts || {};
    var q = (options.q || '').trim().toLowerCase();
    var emotion = options.emotion && options.emotion !== 'all' ? options.emotion : null;
    var savedOnly = Boolean(options.savedOnly);
    var sort = options.sort === 'top' ? 'top' : 'newest';
    var limit = Math.max(1, Math.min(100, options.limit || 20));
    var offset = Math.max(0, options.offset || 0);

    var savedIds = savedOnly ? getSavedIds() : null;
    var filtered = all.slice();

    if (savedIds) {
      filtered = filtered.filter(function (c) {
        return savedIds.indexOf(c.id) !== -1;
      });
    }
    if (emotion) {
      filtered = filtered.filter(function (c) {
        return c.emotion === emotion;
      });
    }
    if (q) {
      filtered = filtered.filter(function (c) {
        return (
          c.content.toLowerCase().indexOf(q) !== -1 ||
          (c.ai_advice && c.ai_advice.toLowerCase().indexOf(q) !== -1) ||
          (c.emotion && c.emotion.toLowerCase().indexOf(q) !== -1)
        );
      });
    }

    filtered.sort(function (a, b) {
      if (sort === 'top') {
        var diff = reactionScore(b.reactions) - reactionScore(a.reactions);
        if (diff !== 0) return diff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    var total = filtered.length;
    var items = filtered.slice(offset, offset + limit);
    return {
      confessions: items,
      total: total,
      hasMore: offset + items.length < total,
    };
  }

  async function fetchAllConfessions() {
    if (isSharedMode() && typeof fetch === 'function') {
      try {
        var s = getSettings();
        var res = await fetch(
          s.supabaseUrl + '/rest/v1/confessions?select=*&order=created_at.desc&limit=100',
          { headers: supabaseHeaders() }
        );
        if (res.ok) {
          var rows = await res.json();
          if (Array.isArray(rows)) {
            var normalized = rows.map(normalizeRow);
            saveLocalAll(normalized);
            return { items: normalized, source: 'shared' };
          }
        }
      } catch (_) {
        // Fall back to cached local store
      }
    }
    return { items: loadLocalAll(), source: 'local' };
  }

  async function listPublic(opts) {
    var fetched = await fetchAllConfessions();
    var result = filterAndSort(fetched.items, opts);
    result.source = fetched.source;
    return result;
  }

  function listPublicSync(opts) {
    return filterAndSort(loadLocalAll(), opts);
  }

  function getByIdSync(id) {
    return (
      loadLocalAll().find(function (c) {
        return c.id === id;
      }) || null
    );
  }

  function getRandomSync() {
    var list = loadLocalAll();
    if (list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function checkPostRateLimit(maxPosts, windowMs) {
    var max = maxPosts || 15;
    var win = windowMs || 15 * 60 * 1000;
    var now = Date.now();
    var timestamps = readJson(STORAGE_KEYS.rateLimit, []).filter(function (t) {
      return t > now - win;
    });

    if (timestamps.length >= max) {
      writeJson(STORAGE_KEYS.rateLimit, timestamps);
      return { allowed: false, resetAt: timestamps[0] + win };
    }

    timestamps.push(now);
    writeJson(STORAGE_KEYS.rateLimit, timestamps);
    return { allowed: true, remaining: max - timestamps.length };
  }

  function getMyPostIds() {
    var ids = readJson(STORAGE_KEYS.myPosts, []);
    return Array.isArray(ids) ? ids : [];
  }

  function isMyPost(id) {
    return getMyPostIds().indexOf(id) !== -1;
  }

  function markMyPost(id) {
    var myIds = getMyPostIds();
    if (myIds.indexOf(id) === -1) {
      myIds.unshift(id);
      writeJson(STORAGE_KEYS.myPosts, myIds);
    }
  }

  async function createConfession(input) {
    var payload = {
      id: generateUuid(),
      content: input.content,
      emotion: input.emotion || 'neutral',
      ai_emoji: input.ai_emoji || '✨',
      ai_advice: input.ai_advice || '',
      ai_steps: Array.isArray(input.ai_steps) ? input.ai_steps : [],
      created_at: new Date().toISOString(),
      reactions: emptyReactions(),
      replies: [],
    };

    if (isSharedMode() && typeof fetch === 'function') {
      try {
        var s = getSettings();
        var res = await fetch(s.supabaseUrl + '/rest/v1/confessions', {
          method: 'POST',
          headers: Object.assign({}, supabaseHeaders(), {
            Prefer: 'return=representation',
          }),
          body: JSON.stringify({
            content: payload.content,
            emotion: payload.emotion,
            ai_emoji: payload.ai_emoji,
            ai_advice: payload.ai_advice,
            ai_steps: payload.ai_steps,
            reactions: payload.reactions,
            replies: payload.replies,
          }),
        });
        if (res.ok) {
          var inserted = await res.json();
          if (Array.isArray(inserted) && inserted[0]) {
            payload = normalizeRow(inserted[0]);
          }
        }
      } catch (_) {
        // Fall through to local cache
      }
    }

    var list = loadLocalAll();
    list.unshift(payload);
    saveLocalAll(list);
    markMyPost(payload.id);
    return payload;
  }

  function deleteMyPost(id) {
    if (!isMyPost(id)) return false;
    var list = loadLocalAll();
    var next = list.filter(function (c) {
      return c.id !== id;
    });
    saveLocalAll(next);
    writeJson(
      STORAGE_KEYS.myPosts,
      getMyPostIds().filter(function (x) {
        return x !== id;
      })
    );
    return next.length !== list.length;
  }

  async function patchRemote(id, fields) {
    if (!isSharedMode() || typeof fetch !== 'function') return;
    try {
      var s = getSettings();
      await fetch(
        s.supabaseUrl + '/rest/v1/confessions?id=eq.' + encodeURIComponent(id),
        {
          method: 'PATCH',
          headers: supabaseHeaders(),
          body: JSON.stringify(fields),
        }
      );
    } catch (_) {
      // Keep local update
    }
  }

  function getReactedMap() {
    return readJson(STORAGE_KEYS.reacted, {});
  }

  async function toggleReaction(confessionId, emoji) {
    if (REACTION_EMOJIS.indexOf(emoji) === -1) return null;
    var list = loadLocalAll();
    var idx = list.findIndex(function (c) {
      return c.id === confessionId;
    });
    if (idx === -1) return null;

    var reactedMap = getReactedMap();
    var currentActive = Array.isArray(reactedMap[confessionId])
      ? reactedMap[confessionId]
      : [];
    var isActive = currentActive.indexOf(emoji) !== -1;

    var nextActive = isActive
      ? currentActive.filter(function (e) {
          return e !== emoji;
        })
      : currentActive.concat([emoji]);

    reactedMap[confessionId] = nextActive;
    writeJson(STORAGE_KEYS.reacted, reactedMap);

    var reactions = Object.assign({}, emptyReactions(), list[idx].reactions || {});
    reactions[emoji] = Math.max(0, (reactions[emoji] || 0) + (isActive ? -1 : 1));
    list[idx] = Object.assign({}, list[idx], { reactions: reactions });
    saveLocalAll(list);

    await patchRemote(confessionId, { reactions: reactions });

    return {
      confession: list[idx],
      activeEmojis: nextActive,
      added: !isActive,
    };
  }

  function getMyReplyIds() {
    var ids = readJson(STORAGE_KEYS.myReplies, []);
    return Array.isArray(ids) ? ids : [];
  }

  function isMyReply(replyId) {
    return getMyReplyIds().indexOf(replyId) !== -1;
  }

  async function addReply(confessionId, content) {
    var trimmed = (content || '').trim();
    if (trimmed.length < 2 || trimmed.length > 500) return null;
    var list = loadLocalAll();
    var idx = list.findIndex(function (c) {
      return c.id === confessionId;
    });
    if (idx === -1) return null;

    var reply = {
      id: generateUuid(),
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    var nextReplies = (Array.isArray(list[idx].replies) ? list[idx].replies : []).concat([
      reply,
    ]);
    list[idx] = Object.assign({}, list[idx], { replies: nextReplies });
    saveLocalAll(list);

    var myReplies = getMyReplyIds();
    myReplies.unshift(reply.id);
    writeJson(STORAGE_KEYS.myReplies, myReplies);

    await patchRemote(confessionId, { replies: nextReplies });
    return reply;
  }

  function getSavedIds() {
    var ids = readJson(STORAGE_KEYS.saved, []);
    return Array.isArray(ids) ? ids : [];
  }

  function isSaved(id) {
    return getSavedIds().indexOf(id) !== -1;
  }

  function toggleSaved(id) {
    var ids = getSavedIds();
    var exists = ids.indexOf(id) !== -1;
    var next = exists
      ? ids.filter(function (x) {
          return x !== id;
        })
      : [id].concat(ids);
    writeJson(STORAGE_KEYS.saved, next);
    return !exists;
  }

  function getDraft(name) {
    return getStorage().getItem(STORAGE_KEYS.draftPrefix + name) || '';
  }

  function saveDraft(name, value) {
    var key = STORAGE_KEYS.draftPrefix + name;
    if (!value) {
      getStorage().removeItem(key);
    } else {
      getStorage().setItem(key, String(value));
    }
  }

  function getChatHistory() {
    var list = readJson(STORAGE_KEYS.chatHistory, []);
    return Array.isArray(list) ? list : [];
  }

  function saveChatHistory(messages) {
    writeJson(STORAGE_KEYS.chatHistory, Array.isArray(messages) ? messages : []);
  }

  function clearChatHistory() {
    getStorage().removeItem(STORAGE_KEYS.chatHistory);
  }

  function exportJson() {
    return JSON.stringify(loadLocalAll(), null, 2);
  }

  function importJson(raw) {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of confessions.');
    }
    var valid = parsed
      .filter(function (item) {
        return item && typeof item.id === 'string' && typeof item.content === 'string';
      })
      .map(normalizeRow);
    if (valid.length === 0) {
      throw new Error('No valid confessions found.');
    }
    saveLocalAll(valid);
    return valid.length;
  }

  function resetDemoData() {
    var seeded = buildSeedConfessions();
    saveLocalAll(seeded);
    writeJson(STORAGE_KEYS.reacted, {});
    writeJson(STORAGE_KEYS.saved, []);
    writeJson(STORAGE_KEYS.myPosts, []);
    writeJson(STORAGE_KEYS.myReplies, []);
    return seeded;
  }

  function formatRelativeTime(dateString) {
    var date = new Date(dateString);
    var diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 60) return 'just now';
    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return date.toLocaleDateString();
  }

  root.ConfessionStore = {
    STORAGE_KEYS: STORAGE_KEYS,
    REACTION_EMOJIS: REACTION_EMOJIS,
    EMOTION_FILTERS: EMOTION_FILTERS,
    getSettings: getSettings,
    saveSettings: saveSettings,
    isSharedMode: isSharedMode,
    listPublic: listPublic,
    listPublicSync: listPublicSync,
    getByIdSync: getByIdSync,
    getRandomSync: getRandomSync,
    checkPostRateLimit: checkPostRateLimit,
    isMyPost: isMyPost,
    createConfession: createConfession,
    deleteMyPost: deleteMyPost,
    getReactedMap: getReactedMap,
    toggleReaction: toggleReaction,
    isMyReply: isMyReply,
    addReply: addReply,
    getSavedIds: getSavedIds,
    isSaved: isSaved,
    toggleSaved: toggleSaved,
    getDraft: getDraft,
    saveDraft: saveDraft,
    getChatHistory: getChatHistory,
    saveChatHistory: saveChatHistory,
    clearChatHistory: clearChatHistory,
    exportJson: exportJson,
    importJson: importJson,
    resetDemoData: resetDemoData,
    formatRelativeTime: formatRelativeTime,
  };
})(typeof window !== 'undefined' ? window : globalThis);
