(function (root) {
  'use strict';

  var STORAGE_KEYS = {
    confessions: 'cw_vanilla_confessions_v1',
    reacted: 'cw_vanilla_reacted_v1',
    rateLimit: 'cw_vanilla_ratelimit_v1',
    settings: 'cw_vanilla_settings_v1',
    adminSession: 'cw_vanilla_admin_session_v1',
    adminPassHash: 'cw_vanilla_admin_pass_v1',
    adviceHistory: 'cw_vanilla_advice_v1',
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
        status: 'approved',
        ai_emoji: '🫂',
        ai_comment:
          'Sometimes a tiny act of kindness becomes an anchor for years. Keeping that note is a quiet reminder of how much light can come from unexpected places.',
        moderation_reason: null,
        report_count: 0,
        created_at: new Date(now - 1000 * 60 * 42).toISOString(),
        reactions: { '❤️': 18, '😂': 0, '😢': 6, '😮': 4 },
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        content:
          'At work everyone thinks I am a productivity wizard, but half of my "deep focus blocks" are just me staring at a bug until my brain reboots.',
        category: 'Work',
        status: 'approved',
        ai_emoji: '😅',
        ai_comment:
          'To be fair, tactical staring is an underrated debugging technique. If the bug eventually yields, the wizard title stands.',
        moderation_reason: null,
        report_count: 0,
        created_at: new Date(now - 1000 * 60 * 115).toISOString(),
        reactions: { '❤️': 7, '😂': 24, '😢': 1, '😮': 2 },
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        content:
          'I learned how to bake sourdough just so I would have an excuse to bring extra loaves to my neighbor without making things awkward.',
        category: 'Love',
        status: 'approved',
        ai_emoji: '🫶',
        ai_comment:
          'Using artisanal bread as a stealth affection strategy is genuinely adorable. Wishing your loaves and your conversations both rise nicely.',
        moderation_reason: null,
        report_count: 0,
        created_at: new Date(now - 1000 * 60 * 240).toISOString(),
        reactions: { '❤️': 31, '😂': 9, '😢': 0, '😮': 5 },
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

  function listPublic(opts) {
    var options = opts || {};
    var q = (options.q || '').trim().toLowerCase();
    var category =
      options.category && options.category !== 'All' ? options.category : null;
    var sort = options.sort === 'top' ? 'top' : 'newest';
    var limit = Math.max(1, Math.min(100, options.limit || 20));
    var offset = Math.max(0, options.offset || 0);

    var filtered = loadAll().filter(function (c) {
      return c.status === 'approved';
    });

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
          (c.category && c.category.toLowerCase().indexOf(q) !== -1)
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
    var list = loadAll();
    return (
      list.find(function (c) {
        return c.id === id && c.status === 'approved';
      }) || null
    );
  }

  function getRandom() {
    var approved = loadAll().filter(function (c) {
      return c.status === 'approved';
    });
    if (approved.length === 0) return null;
    return approved[Math.floor(Math.random() * approved.length)];
  }

  function checkPostRateLimit(maxPosts, windowMs) {
    var max = maxPosts || 5;
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

  function createConfession(input) {
    var list = loadAll();
    var record = {
      id: generateUuid(),
      content: input.content,
      category: CATEGORIES.indexOf(input.category) !== -1 ? input.category : 'Confession',
      status: input.status || 'approved',
      ai_emoji: input.ai_emoji || null,
      ai_comment: input.ai_comment || null,
      moderation_reason: input.moderation_reason || null,
      report_count: 0,
      created_at: new Date().toISOString(),
      reactions: emptyReactions(),
    };
    list.unshift(record);
    saveAll(list);
    return record;
  }

  function getReactedMap() {
    return readJson(STORAGE_KEYS.reacted, {});
  }

  function toggleReaction(confessionId, emoji) {
    if (REACTION_EMOJIS.indexOf(emoji) === -1) return null;
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === confessionId && c.status === 'approved';
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

  function reportConfession(id, reason) {
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === id && c.status === 'approved';
    });
    if (idx === -1) return null;

    var nextCount = (list[idx].report_count || 0) + 1;
    list[idx] = Object.assign({}, list[idx], {
      report_count: nextCount,
      status: 'flagged',
      moderation_reason: 'User report: ' + reason,
    });
    saveAll(list);
    return list[idx];
  }

  function listAdmin(opts) {
    var options = opts || {};
    var status = options.status || 'all';
    var q = (options.q || '').trim().toLowerCase();
    var all = loadAll();

    var counts = {
      all: all.length,
      flagged: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    all.forEach(function (c) {
      if (Object.prototype.hasOwnProperty.call(counts, c.status)) {
        counts[c.status] += 1;
      }
    });

    var filtered =
      status === 'all'
        ? all.slice()
        : all.filter(function (c) {
            return c.status === status;
          });

    if (q) {
      filtered = filtered.filter(function (c) {
        return (
          c.content.toLowerCase().indexOf(q) !== -1 ||
          (c.moderation_reason && c.moderation_reason.toLowerCase().indexOf(q) !== -1) ||
          (c.category && c.category.toLowerCase().indexOf(q) !== -1)
        );
      });
    }

    filtered.sort(function (a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { confessions: filtered, counts: counts };
  }

  function updateConfessionAdmin(id, patch) {
    var list = loadAll();
    var idx = list.findIndex(function (c) {
      return c.id === id;
    });
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch);
    saveAll(list);
    return list[idx];
  }

  function deleteConfession(id) {
    var list = loadAll();
    var next = list.filter(function (c) {
      return c.id !== id;
    });
    if (next.length === list.length) return false;
    saveAll(next);
    return true;
  }

  function getSettings() {
    return readJson(STORAGE_KEYS.settings, { aiProxyUrl: '' });
  }

  function saveSettings(settings) {
    writeJson(STORAGE_KEYS.settings, {
      aiProxyUrl: (settings && settings.aiProxyUrl ? settings.aiProxyUrl : '').trim().replace(/\/+$/, ''),
    });
  }

  function exportJson() {
    return JSON.stringify(loadAll(), null, 2);
  }

  function importJson(raw) {
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of confessions.');
    }
    var valid = parsed.filter(function (item) {
      return item && typeof item.id === 'string' && typeof item.content === 'string';
    });
    saveAll(valid);
    return valid.length;
  }

  function resetDemoData() {
    var seeded = buildSeedConfessions();
    saveAll(seeded);
    writeJson(STORAGE_KEYS.reacted, {});
    return seeded;
  }

  function simpleHash(str) {
    var h1 = 0xdeadbeef;
    var h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i += 1) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  function getAdminPassHash() {
    var stored = getStorage().getItem(STORAGE_KEYS.adminPassHash);
    if (stored) return stored;
    var defaultHash = simpleHash('cw-salt:' + 'admin123');
    getStorage().setItem(STORAGE_KEYS.adminPassHash, defaultHash);
    return defaultHash;
  }

  function verifyAdminPasscode(passcode) {
    return simpleHash('cw-salt:' + passcode) === getAdminPassHash();
  }

  function setAdminPasscode(nextPasscode) {
    getStorage().setItem(STORAGE_KEYS.adminPassHash, simpleHash('cw-salt:' + nextPasscode));
  }

  function isAdminSignedIn() {
    return getStorage().getItem(STORAGE_KEYS.adminSession) === 'active';
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

  function setAdminSignedIn(active) {
    if (active) {
      getStorage().setItem(STORAGE_KEYS.adminSession, 'active');
    } else {
      getStorage().removeItem(STORAGE_KEYS.adminSession);
    }
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
    REACTION_EMOJIS: REACTION_EMOJIS,
    listPublic: listPublic,
    getById: getById,
    getRandom: getRandom,
    checkPostRateLimit: checkPostRateLimit,
    createConfession: createConfession,
    getReactedMap: getReactedMap,
    toggleReaction: toggleReaction,
    reportConfession: reportConfession,
    listAdmin: listAdmin,
    updateConfessionAdmin: updateConfessionAdmin,
    deleteConfession: deleteConfession,
    getSettings: getSettings,
    saveSettings: saveSettings,
    exportJson: exportJson,
    importJson: importJson,
    resetDemoData: resetDemoData,
    verifyAdminPasscode: verifyAdminPasscode,
    setAdminPasscode: setAdminPasscode,
    isAdminSignedIn: isAdminSignedIn,
    setAdminSignedIn: setAdminSignedIn,
    getAdviceHistory: getAdviceHistory,
    saveAdviceHistory: saveAdviceHistory,
    clearAdviceHistory: clearAdviceHistory,
    formatRelativeTime: formatRelativeTime,
  };
})(typeof window !== 'undefined' ? window : globalThis);
