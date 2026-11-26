(function (root) {
  'use strict';

  var STORAGE_KEYS = {
    confessions: 'cw_vanilla_confessions_v1',
    reacted: 'cw_vanilla_reacted_v1',
    saved: 'cw_vanilla_saved_v1',
    myPosts: 'cw_vanilla_my_posts_v1',
    myReplies: 'cw_vanilla_my_replies_v1',
    rateLimit: 'cw_vanilla_ratelimit_v1',
    settings: 'cw_vanilla_settings_v1',
    adviceHistory: 'cw_vanilla_advice_v1',
    draftPrefix: 'cw_vanilla_draft_',
  };

  var CATEGORIES = [
    'Confession',
    'Secret',
    'Love',
    'Work',
    'School',
    'Funny',
    'Vent',
    'Regret',
  ];

  var MOODS = [
    '',
    '🌙 Late Night',
    '💔 Heartache',
    '😤 Venting',
    '🤫 Deep Secret',
    '🌟 Hopeful',
  ];

  var REACTION_EMOJIS = ['❤️', '😂', '😢', '😮'];

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
          'I still keep the handwritten note a stranger left on my car windshield three years ago when I was having the worst week of my life. It just said "You matter more than you know."',
        category: 'Secret',
        mood: '🌟 Hopeful',
        ai_emoji: '🫂',
        ai_comment:
          'Sometimes a tiny act of kindness becomes an anchor for years. Keeping that note is a quiet reminder of how much light can come from unexpected places.',
        created_at: new Date(now - 1000 * 60 * 42).toISOString(),
        reactions: { '❤️': 18, '😂': 0, '😢': 6, '😮': 4 },
        replies: [
          {
            id: 'aaaa1111-1111-4111-8111-111111111111',
            content: 'That stranger probably has no idea how much they helped you. Glad you are still here!',
            created_at: new Date(now - 1000 * 60 * 20).toISOString(),
          },
        ],
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        content:
          'At work everyone thinks I am a productivity wizard, but half of my "deep focus blocks" are just me staring at a bug until my brain reboots.',
        category: 'Work',
        mood: '😤 Venting',
        ai_emoji: '😅',
        ai_comment:
          'To be fair, tactical staring is an underrated debugging technique. If the bug eventually yields, the wizard title stands.',
        created_at: new Date(now - 1000 * 60 * 115).toISOString(),
        reactions: { '❤️': 7, '😂': 24, '😢': 1, '😮': 2 },
        replies: [],
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        content:
          'I learned how to bake sourdough just so I would have an excuse to bring extra loaves to my neighbor without making things awkward.',
        category: 'Love',
        mood: '🤫 Deep Secret',
        ai_emoji: '🫶',
        ai_comment:
          'Using artisanal bread as a stealth affection strategy is genuinely adorable. Wishing your loaves and your conversations both rise nicely.',
        created_at: new Date(now - 1000 * 60 * 240).toISOString(),
        reactions: { '❤️': 31, '😂': 9, '😢': 0, '😮': 5 },
        replies: [],
      },
    ];
  }

  function loadAll() {
    var list = readJson(STORAGE_KEYS.confessions, null);
    if (Array.isArray(list)) return list;
    var seeded = buildSeedConfessions();
    writeJson(STORAGE_KEYS.confessions, seeded);
    return seeded;
  }

  function saveAll(list) {
    writeJson(STORAGE_KEYS.confessions, list);
  }

  function reactionScore(reactions) {
    return REACTION_EMOJIS.reduce(function (sum, emoji) {
      return sum + ((reactions && reactions[emoji]) || 0);
    }, 0);
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

  function listPublic(opts) {
    var options = opts || {};
    var q = (options.q || '').trim().toLowerCase();
    var category =
      options.category && options.category !== 'All' ? options.category : null;
    var savedOnly = Boolean(options.savedOnly);
    var sort = options.sort === 'top' ? 'top' : 'newest';
    var limit = Math.max(1, Math.min(100, options.limit || 20));
    var offset = Math.max(0, options.offset || 0);

    var savedSet = savedOnly ? getSavedIds() : null;

    var filtered = loadAll().filter(function (c) {
      return !c.status || c.status === 'approved';
    });

    if (savedSet) {
      filtered = filtered.filter(function (c) {
        return savedSet.indexOf(c.id) !== -1;
      });
    }

    if (category) {
      filtered = filtered.filter(function (c) {
        return c.category === category;
      });
    }

    if (q) {
      filtered = filtered.filter(function (c) {
        return (
          c.content.toLowerCase().indexOf(q) !== -1 ||
          (c.ai_comment && c.ai_comment.toLowerCase().indexOf(q) !== -1) ||
          (c.category && c.category.toLowerCase().indexOf(q) !== -1) ||
          (c.mood && c.mood.toLowerCase().indexOf(q) !== -1)
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

  function getById(id) {
    return (
      loadAll().find(function (c) {
        return c.id === id && (!c.status || c.status === 'approved');
      }) || null
    );
  }

  function getRandom() {
    var list = loadAll().filter(function (c) {
      return !c.status || c.status === 'approved';
    });
    if (list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  function checkPostRateLimit(maxPosts, windowMs) {
    var max = maxPosts || 10;
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

  function createConfession(input) {
    var list = loadAll();
    var record = {
      id: generateUuid(),
      content: input.content,
      category: CATEGORIES.indexOf(input.category) !== -1 ? input.category : 'Confession',
      mood: MOODS.indexOf(input.mood || '') !== -1 ? input.mood || '' : '',
      ai_emoji: input.ai_emoji || null,
      ai_comment: input.ai_comment || null,
      created_at: new Date().toISOString(),
      reactions: emptyReactions(),
      replies: [],
    };
    list.unshift(record);
    saveAll(list);

    var myIds = getMyPostIds();
    myIds.unshift(record.id);
    writeJson(STORAGE_KEYS.myPosts, myIds);

    return record;
  }

  function updateMyPost(id, nextContent, nextCategory) {
    if (!isMyPost(id)) return null;
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === id;
    });
    if (idx === -1) return null;
    var trimmed = (nextContent || '').trim();
    if (trimmed.length < 5 || trimmed.length > 1000) return null;

    list[idx] = Object.assign({}, list[idx], {
      content: trimmed,
      category:
        nextCategory && CATEGORIES.indexOf(nextCategory) !== -1
          ? nextCategory
          : list[idx].category,
      edited_at: new Date().toISOString(),
    });
    saveAll(list);
    return list[idx];
  }

  function deleteMyPost(id) {
    if (!isMyPost(id)) return false;
    var list = loadAll();
    var next = list.filter(function (c) {
      return c.id !== id;
    });
    saveAll(next);

    var myIds = getMyPostIds().filter(function (item) {
      return item !== id;
    });
    writeJson(STORAGE_KEYS.myPosts, myIds);
    return next.length !== list.length;
  }

  function getMyReplyIds() {
    var ids = readJson(STORAGE_KEYS.myReplies, []);
    return Array.isArray(ids) ? ids : [];
  }

  function isMyReply(replyId) {
    return getMyReplyIds().indexOf(replyId) !== -1;
  }

  function addReply(confessionId, content) {
    var trimmed = (content || '').trim();
    if (trimmed.length < 2 || trimmed.length > 500) return null;
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === confessionId;
    });
    if (idx === -1) return null;

    var reply = {
      id: generateUuid(),
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    var existing = Array.isArray(list[idx].replies) ? list[idx].replies : [];
    list[idx] = Object.assign({}, list[idx], {
      replies: existing.concat([reply]),
    });
    saveAll(list);

    var myReplies = getMyReplyIds();
    myReplies.unshift(reply.id);
    writeJson(STORAGE_KEYS.myReplies, myReplies);
    return reply;
  }

  function deleteMyReply(confessionId, replyId) {
    if (!isMyReply(replyId)) return false;
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === confessionId;
    });
    if (idx === -1) return false;

    var existing = Array.isArray(list[idx].replies) ? list[idx].replies : [];
    var next = existing.filter(function (r) {
      return r.id !== replyId;
    });
    if (next.length === existing.length) return false;

    list[idx] = Object.assign({}, list[idx], { replies: next });
    saveAll(list);

    writeJson(
      STORAGE_KEYS.myReplies,
      getMyReplyIds().filter(function (x) {
        return x !== replyId;
      })
    );
    return true;
  }

  function getReactedMap() {
    return readJson(STORAGE_KEYS.reacted, {});
  }

  function toggleReaction(confessionId, emoji) {
    if (REACTION_EMOJIS.indexOf(emoji) === -1) return null;
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === confessionId && (!c.status || c.status === 'approved');
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
    var delta = isActive ? -1 : 1;
    reactions[emoji] = Math.max(0, (reactions[emoji] || 0) + delta);
    list[idx] = Object.assign({}, list[idx], { reactions: reactions });
    saveAll(list);

    return {
      confession: list[idx],
      activeEmojis: nextActive,
      added: !isActive,
    };
  }

  function getSettings() {
    var saved = readJson(STORAGE_KEYS.settings, {});
    return {
      aiProxyUrl: saved.aiProxyUrl || '',
      theme: saved.theme === 'light' ? 'light' : 'dark',
    };
  }

  function saveSettings(partial) {
    var current = getSettings();
    var next = Object.assign({}, current, partial || {});
    next.aiProxyUrl = (next.aiProxyUrl || '').trim().replace(/\/+$/, '');
    next.theme = next.theme === 'light' ? 'light' : 'dark';
    writeJson(STORAGE_KEYS.settings, next);
    return next;
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

  function exportJson() {
    return JSON.stringify(loadAll(), null, 2);
  }

  function importJson(raw) {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of confessions.');
    }
    var valid = parsed
      .filter(function (item) {
        return (
          item &&
          typeof item.id === 'string' &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0
        );
      })
      .map(function (item) {
        return Object.assign({}, item, {
          category:
            CATEGORIES.indexOf(item.category) !== -1
              ? item.category
              : 'Confession',
          reactions: Object.assign({}, emptyReactions(), item.reactions || {}),
          replies: Array.isArray(item.replies) ? item.replies : [],
        });
      });

    if (valid.length === 0) {
      throw new Error('No valid confessions found in JSON.');
    }

    saveAll(valid);
    return valid.length;
  }

  function resetDemoData() {
    var seeded = buildSeedConfessions();
    saveAll(seeded);
    writeJson(STORAGE_KEYS.reacted, {});
    writeJson(STORAGE_KEYS.saved, []);
    writeJson(STORAGE_KEYS.myPosts, []);
    writeJson(STORAGE_KEYS.myReplies, []);
    return seeded;
  }

  function getAdviceHistory() {
    var list = readJson(STORAGE_KEYS.adviceHistory, []);
    return Array.isArray(list) ? list : [];
  }

  function saveAdviceHistory(messages) {
    writeJson(STORAGE_KEYS.adviceHistory, Array.isArray(messages) ? messages : []);
  }

  function clearAdviceHistory() {
    getStorage().removeItem(STORAGE_KEYS.adviceHistory);
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
    CATEGORIES: CATEGORIES,
    MOODS: MOODS,
    REACTION_EMOJIS: REACTION_EMOJIS,
    listPublic: listPublic,
    getById: getById,
    getRandom: getRandom,
    checkPostRateLimit: checkPostRateLimit,
    isMyPost: isMyPost,
    createConfession: createConfession,
    updateMyPost: updateMyPost,
    deleteMyPost: deleteMyPost,
    isMyReply: isMyReply,
    addReply: addReply,
    deleteMyReply: deleteMyReply,
    getSavedIds: getSavedIds,
    isSaved: isSaved,
    toggleSaved: toggleSaved,
    getReactedMap: getReactedMap,
    toggleReaction: toggleReaction,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getDraft: getDraft,
    saveDraft: saveDraft,
    exportJson: exportJson,
    importJson: importJson,
    resetDemoData: resetDemoData,
    getAdviceHistory: getAdviceHistory,
    saveAdviceHistory: saveAdviceHistory,
    clearAdviceHistory: clearAdviceHistory,
    formatRelativeTime: formatRelativeTime,
  };
})(typeof window !== 'undefined' ? window : globalThis);
