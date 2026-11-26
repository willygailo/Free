(function (root) {
  'use strict';

  var MOOD_META = {
    happy: {
      label: 'Feeling Happy',
      emoji: '😊',
      particles: ['✨', '🎉', '💛', '🌟', '☀️', '🎊'],
      animation: 'confetti',
      count: 24,
    },
    sad: {
      label: 'Feeling Sad',
      emoji: '🌧️',
      particles: ['💧', '🌧️', '💙', '🫧', '🫂'],
      animation: 'rain',
      count: 22,
    },
    love: {
      label: 'Feeling Love',
      emoji: '💖',
      particles: ['💖', '🫶', '💕', '✨', '🌸', '❤️'],
      animation: 'float',
      count: 20,
    },
    angry: {
      label: 'Stressed / Frustrated',
      emoji: '😤',
      particles: ['🔥', '💨', '🌊', '✨', '🧊'],
      animation: 'burst',
      count: 18,
    },
    anxious: {
      label: 'Anxious / Overthinking',
      emoji: '🌊',
      particles: ['🌊', '🍃', '🫧', '✨', '🤍'],
      animation: 'breath',
      count: 16,
    },
    tired: {
      label: 'Tired / Drained',
      emoji: '🌙',
      particles: ['🌙', '⭐', '☁️', '☕', '✨'],
      animation: 'float',
      count: 16,
    },
    crisis: {
      label: 'Needs Care',
      emoji: '🫂',
      particles: ['🫂', '🤍', '✨', '💛'],
      animation: 'breath',
      count: 14,
    },
    neutral: {
      label: 'Open Confession',
      emoji: '✨',
      particles: ['✨', '💜', '⭐', '💫'],
      animation: 'float',
      count: 16,
    },
  };

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function ensureLayer() {
    if (typeof document === 'undefined') return null;
    var existing = document.getElementById('moodEffectsLayer');
    if (existing) return existing;
    var layer = document.createElement('div');
    layer.id = 'moodEffectsLayer';
    layer.className = 'effects-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }

  function setCardMood(cardEl, emotion) {
    if (!cardEl) return;
    var keys = Object.keys(MOOD_META);
    keys.forEach(function (k) {
      cardEl.classList.remove('mood-' + k);
    });
    if (emotion && MOOD_META[emotion]) {
      cardEl.classList.add('mood-' + emotion);
    }
  }

  function triggerMoodEffect(emotion, anchorEl) {
    var key = MOOD_META[emotion] ? emotion : 'neutral';
    var meta = MOOD_META[key];

    if (anchorEl) {
      setCardMood(anchorEl, key);
      anchorEl.classList.remove('card-pulse');
      // Reflow so repeated sends re-trigger pulse cleanly
      void anchorEl.offsetWidth;
      anchorEl.classList.add('card-pulse');
    }

    if (prefersReducedMotion()) return;
    var layer = ensureLayer();
    if (!layer) return;

    var rect = anchorEl
      ? anchorEl.getBoundingClientRect()
      : {
          left: window.innerWidth * 0.25,
          top: window.innerHeight * 0.25,
          width: window.innerWidth * 0.5,
          height: 220,
        };

    // Breathing aura ring for anxious / crisis
    if (meta.animation === 'breath') {
      var ring = document.createElement('div');
      ring.className = 'breath-ring';
      ring.style.left = rect.left + rect.width / 2 + 'px';
      ring.style.top = rect.top + rect.height / 2 + 'px';
      layer.appendChild(ring);
      setTimeout(function () {
        if (ring.parentNode) ring.parentNode.removeChild(ring);
      }, 2200);
    }

    for (var i = 0; i < meta.count; i += 1) {
      var p = document.createElement('span');
      p.className = 'fx-particle fx-' + meta.animation;
      p.textContent = meta.particles[i % meta.particles.length];

      var startX = rect.left + Math.random() * rect.width;
      var startY =
        meta.animation === 'rain'
          ? Math.max(0, rect.top - 20 - Math.random() * 60)
          : rect.top + rect.height * (0.25 + Math.random() * 0.65);

      var driftX = (Math.random() - 0.5) * 160;
      var duration = 1200 + Math.random() * 1200;
      var delay = Math.random() * 260;
      var size = 14 + Math.random() * 14;

      p.style.left = startX + 'px';
      p.style.top = startY + 'px';
      p.style.fontSize = size + 'px';
      p.style.setProperty('--dx', driftX.toFixed(1) + 'px');
      p.style.animationDuration = duration.toFixed(0) + 'ms';
      p.style.animationDelay = delay.toFixed(0) + 'ms';

      layer.appendChild(p);

      (function (node, ttl) {
        setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, ttl);
      })(p, duration + delay + 120);
    }
  }

  function getMoodMeta(emotion) {
    return MOOD_META[emotion] || MOOD_META.neutral;
  }

  root.ConfessionEffects = {
    MOOD_META: MOOD_META,
    getMoodMeta: getMoodMeta,
    setCardMood: setCardMood,
    triggerMoodEffect: triggerMoodEffect,
  };
})(typeof window !== 'undefined' ? window : globalThis);
