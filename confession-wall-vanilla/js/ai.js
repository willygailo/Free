(function (root) {
  'use strict';

  var SPAM_LINK_REGEX = /(https?:\/\/[^\s]+|bit\.ly\/|tinyurl\.com\/|buy\s+followers|free\s+crypto|whatsapp\s+me)/i;
  var PII_EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  var PII_PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/;
  var THREAT_HATE_REGEX = /\b(kill\s+yourself|kys|doxx\s+him|doxx\s+her|bomb\s+threat)\b/i;
  var BORDERLINE_REGEX = /\b(hate\s+my\s+boss|want\s+to\s+disappear|revenge|exposed\s+them)\b/i;

  function localModerate(content) {
    var text = (content || '').trim();

    if (THREAT_HATE_REGEX.test(text)) {
      return {
        approved: false,
        flagged: false,
        reason: 'Contains harmful or threatening language.',
      };
    }

    if (PII_EMAIL_REGEX.test(text) || PII_PHONE_REGEX.test(text)) {
      return {
        approved: false,
        flagged: false,
        reason: 'Contains potential personal contact info (phone or email). Please keep confessions anonymous.',
      };
    }

    if (SPAM_LINK_REGEX.test(text)) {
      return {
        approved: false,
        flagged: false,
        reason: 'Promotional links and spam are not allowed on the wall.',
      };
    }

    if (BORDERLINE_REGEX.test(text)) {
      return {
        approved: false,
        flagged: true,
        reason: 'Borderline emotional or conflict content queued for human review.',
      };
    }

    return { approved: true, flagged: false, reason: '' };
  }

  function localReact(content, category) {
    var lower = (content || '').toLowerCase();

    if (/\b(love|crush|date|kiss|bread|flowers|heart|miss)\b/.test(lower) || category === 'Love') {
      return {
        emoji: '🫶',
        comment: 'Quiet feelings are often the bravest ones to carry. Wishing you a gentle moment of honesty soon.',
      };
    }

    if (/\b(laugh|funny|accident|embarrass|lol|haha|wizard|awkward)\b/.test(lower) || category === 'Funny') {
      return {
        emoji: '😅',
        comment: 'Honestly, this sounds like the kind of plot twist that makes a great story later. Deep breaths—we have all been there.',
      };
    }

    if (/\b(work|boss|job|meeting|code|bug|deadline|office|tired)\b/.test(lower) || category === 'Work') {
      return {
        emoji: '☕',
        comment: 'Work stress is real, and nobody operates at 100% every hour. Protect your peace and take that break guilt-free.',
      };
    }

    if (/\b(exam|class|school|college|professor|grade|homework)\b/.test(lower) || category === 'School') {
      return {
        emoji: '📚',
        comment: 'School pressure can feel overwhelming in the moment, but one tough week never defines your whole path.',
      };
    }

    if (/\b(sorry|regret|wish|mistake|guilt|cry|sad|lonely|hurt)\b/.test(lower) || category === 'Regret') {
      return {
        emoji: '🫂',
        comment: 'Thank you for letting that out instead of holding it alone. Growth often starts with admitting what weighed on us.',
      };
    }

    return {
      emoji: '✨',
      comment: 'Thanks for trusting the wall with something real. You are heard, even in anonymity.',
    };
  }

  async function moderate(content) {
    var settings = root.ConfessionStore ? root.ConfessionStore.getSettings() : {};
    if (settings.aiProxyUrl && typeof fetch === 'function') {
      try {
        var res = await fetch(settings.aiProxyUrl + '/api/ai/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (_) {
        // Fall back to built-in engine
      }
    }
    return localModerate(content);
  }

  async function react(content, category) {
    var settings = root.ConfessionStore ? root.ConfessionStore.getSettings() : {};
    if (settings.aiProxyUrl && typeof fetch === 'function') {
      try {
        var res = await fetch(settings.aiProxyUrl + '/api/ai/react', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content, category: category }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (_) {
        // Fall back to built-in engine
      }
    }
    return localReact(content, category);
  }

  root.ConfessionAI = {
    moderate: moderate,
    react: react,
    localModerate: localModerate,
    localReact: localReact,
  };
})(typeof window !== 'undefined' ? window : globalThis);
