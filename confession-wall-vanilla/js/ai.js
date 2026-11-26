(function (root) {
  'use strict';

  var SPAM_LINK_REGEX = /(https?:\/\/[^\s]+|bit\.ly\/|tinyurl\.com\/|buy\s+followers|free\s+crypto|whatsapp\s+me)/i;
  var PII_EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  var PII_PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\b/;
  var THREAT_HATE_REGEX = /\b(kill\s+yourself|kys|doxx\s+him|doxx\s+her|bomb\s+threat)\b/i;

  function localModerate(content) {
    var text = (content || '').trim();

    if (THREAT_HATE_REGEX.test(text)) {
      return {
        approved: false,
        reason: 'Contains harmful or threatening language.',
      };
    }

    if (PII_EMAIL_REGEX.test(text) || PII_PHONE_REGEX.test(text)) {
      return {
        approved: false,
        reason: 'Contains potential personal contact info (phone or email). Please keep confessions anonymous.',
      };
    }

    if (SPAM_LINK_REGEX.test(text)) {
      return {
        approved: false,
        reason: 'Promotional links and spam are not allowed on the wall.',
      };
    }

    return { approved: true, reason: '' };
  }

  function localReact(content, category) {
    var lower = (content || '').toLowerCase();

    if (/\b(love|crush|date|kiss|bread|flowers|heart|miss|mahal|gusto)\b/.test(lower) || category === 'Love') {
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

    if (/\b(work|boss|job|meeting|code|bug|deadline|office|tired|trabaho|pagod)\b/.test(lower) || category === 'Work') {
      return {
        emoji: '☕',
        comment: 'Work stress is real, and nobody operates at 100% every hour. Protect your peace and take that break guilt-free.',
      };
    }

    if (/\b(exam|class|school|college|professor|grade|homework|aral|klase)\b/.test(lower) || category === 'School') {
      return {
        emoji: '📚',
        comment: 'School pressure can feel overwhelming in the moment, but one tough week never defines your whole path.',
      };
    }

    if (/\b(sorry|regret|wish|mistake|guilt|cry|sad|lonely|hurt|lungkot)\b/.test(lower) || category === 'Regret') {
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

  function detectTagalog(text) {
    return /\b(ako|ko|ka|mo|naman|kasi|pero|hindi|di|yung|lang|sana|paano|mahal|pagod|trabaho|pamilya|gusto|ayoko|nahihirapan|talaga|sobra|ba)\b/i.test(
      text
    );
  }

  function localAdvise(messages, persona) {
    var list = Array.isArray(messages) ? messages : [];
    var lastUser = '';
    for (var i = list.length - 1; i >= 0; i -= 1) {
      if (list[i] && list[i].role === 'user') {
        lastUser = String(list[i].content || '');
        break;
      }
    }

    var lower = lastUser.toLowerCase();
    var isTaglish = detectTagalog(lower) || persona === 'taglish_bestie';
    var isFollowUp =
      list.filter(function (m) {
        return m && m.role === 'user';
      }).length > 1;

    if (/\b(suicide|kill myself|end my life|magpakamatay|ayoko na mabuhay|self-harm|hurt myself)\b/i.test(lower)) {
      return {
        moodEmoji: '🫂',
        summary: isTaglish
          ? 'Sobrang bigat ng dala mo ngayon, at hindi mo ito kailangang harapin mag-isa.'
          : 'You are carrying something deeply painful right now, and you do not have to face it alone.',
        advice: isTaglish
          ? 'Mahalaga ang buhay mo. Pakiusap, mag-reach out ka agad sa pinagkakatiwalaang kaibigan, pamilya, o crisis hotline para may makasama at makausap ka ngayon.'
          : 'Your life matters, and you deserve immediate care and support. Please reach out right now to someone you trust or a trained crisis helpline.',
        actionSteps: isTaglish
          ? [
              'Tumawag sa NCMH Crisis Hotline: 1553 o 0917-899-8727 / 0966-351-4518.',
              'Kung nasa ibang bansa, tumawag o mag-text sa 988 (US/Canada) o local emergency number.',
              'Magpadala ng simpleng message sa isang kaibigan o kapamilya: "Kailangan ko ng kausap ngayon."',
            ]
          : [
              'Call or text 988 (US/Canada), 1553 (Philippines NCMH), or local emergency services.',
              'Message one trusted friend or family member and tell them you need someone with you.',
              'Stay in a safe space and take things one hour at a time.',
            ],
        followUpQuestion: isTaglish
          ? 'May isang tao ka bang pwedeng i-message o tawagan ngayon?'
          : 'Is there one person you feel safe calling or texting right now?',
      };
    }

    if (/\b(love|crush|feelings|confess|partner|boyfriend|girlfriend|ex|relationship|breakup|mahal|jowa|relasyon|hiwalay|pag-ibig|ligaw)\b/.test(lower)) {
      return {
        moodEmoji: '🫶',
        summary: isTaglish
          ? 'Ramdam ko kung gaano kahirap kapag puso at peace of mind ang nakataya.'
          : 'Relationships and unspoken feelings can pull your heart in two opposite directions.',
        advice: isTaglish
          ? (persona === 'practical'
              ? 'Sa relasyon, mas nakakasakit ang hulaan kaysa sa malinaw na sagot. Mag-set ng kalmadong usapan o malinaw na boundary para alam mo kung saan ka lulugar.'
              : 'Normal lang na matakot masaktan o makasira ng samahan, pero hindi dapat mawala ang sarili mo habang pinoprotektahan ang iba. Piliin mo ang honesty na may respeto—sa kanya at lalo na sa sarili mo.')
          : 'Clarity may feel scary in the short term, but living in ambiguity drains much more energy over time. Honor your feelings without rushing—communicate honestly, or set a gentle boundary to protect your peace.',
        actionSteps: isTaglish
          ? [
              'Linawin sa sarili mo: ano talaga ang gusto mong mangyari—closure, honesty, o space?',
              'Kung kakausapin mo siya, i-focus sa nararamdaman mo ("I feel...") kaysa paninisi.',
              'Kung hindi sigurado ang kabilang side, bigyan ng limit ang paghihintay para hindi ka maubos.',
            ]
          : [
              'Decide what you need most right now: honest clarity, distance, or time.',
              'If you speak up, frame it around your own feelings rather than demanding a specific outcome.',
              'Protect your emotional energy if the other person shows consistent mixed signals.',
            ],
        followUpQuestion: isTaglish
          ? 'Kung alam mong hindi ka huhusgahan, ano talaga ang gusto mong sabihin sa kanya?'
          : 'If fear were not in the way, what is the honest truth you wish you could say?',
      };
    }

    if (/\b(work|boss|job|resign|burnout|salary|career|trabaho|sahod|pagod|office)\b/.test(lower)) {
      return {
        moodEmoji: '☕',
        summary: isTaglish
          ? 'Nakakaubos talaga ang trabahong hindi na nagbibigay ng pahinga sa utak at katawan.'
          : 'Workplace burnout builds quietly until even small tasks feel exhausting.',
        advice: isTaglish
          ? 'Huwag kang mag-desisyon habang nasa peak ng pagod kung pwede pang mag-pause. I-separate ang short-term burnout sa totoong dead-end environment—minsan pahinga ang kailangan, minsan exit plan.'
          : 'Try not to make irreversible career moves at peak exhaustion if you have room to breathe. Separate temporary overload from a toxic or dead-end environment—then build either boundaries or a calm exit plan.',
        actionSteps: isTaglish
          ? [
              'Mag-lista ng 3 bagay na pinaka-nakaka-drain sa trabaho mo ngayon.',
              'Subukang mag-leave o mag-off ng notifications kahit isang weekend para makapag-reset.',
              'Kung toxic na talaga, mag-update ng resume at mag-apply habang may current income pa.',
            ]
          : [
              'Write down the top 2 stressors at work and whether they are fixable with boundaries.',
              'Take a real screen-free rest block before making big decisions.',
              'If the culture is consistently unhealthy, quietly start exploring options while employed.',
            ],
        followUpQuestion: isTaglish
          ? 'Kung magpapahinga ka ng isang buong linggo, sa tingin mo ba babalik ang gana mo o ayaw mo na talaga sa environment na iyan?'
          : 'If you had a full week of real rest, would you want to return—or is it the environment itself?',
      };
    }

    if (/\b(school|exam|grade|college|thesis|professor|study|aral|klase|pasado|bagsak)\b/.test(lower)) {
      return {
        moodEmoji: '📚',
        summary: isTaglish
          ? 'Ang bigat ng academic pressure, lalo na kapag pakiramdam mong kailangan mong maging perfect.'
          : 'Academic pressure can make every single deadline feel like your whole future is on the line.',
        advice: isTaglish
          ? 'Isang semester o isang exam lang ito—hindi nito binubura ang buong worth at future mo. Hatiin ang malaking gawain sa maliliit na 25-minute blocks para mawala ang paralysis.'
          : 'One grade or exam does not define your worth or your entire future. When everything feels urgent, shrink the scope down to the single next deliverable and work in short, forgiving sprints.',
        actionSteps: isTaglish
          ? [
              'Piliin ang pinaka-urgent na 1 requirement at i-park muna ang iba sa listahan.',
              'Mag-study o mag-work ng 25 minutes lang muna, tapos 5-minute break.',
              'Kausapin ang classmate, adviser, o counselor kung kailangan ng extension o tulong.',
            ]
          : [
              'Pick just one immediate task and ignore the rest of the mountain for the next 30 minutes.',
              'Break the work into 25-minute focused blocks with short breaks.',
              'Reach out to a classmate or instructor early if you need clarification or support.',
            ],
        followUpQuestion: isTaglish
          ? 'Aling subject o requirement ang pinaka-naka-stuck ka ngayon?'
          : 'Which specific assignment or expectation is weighing on you the most right now?',
      };
    }

    return {
      moodEmoji: isFollowUp ? '💡' : '🌱',
      summary: isTaglish
        ? (isFollowUp
            ? 'Salamat sa pagdagdag ng context—mas malinaw na ngayon kung saan nanggagaling ang bigat.'
            : 'Salamat sa pagtitiwala at pag-share ng totoong nararamdaman mo.')
        : (isFollowUp
            ? 'Thank you for sharing more context—that makes what you are carrying much clearer.'
            : 'Thank you for putting your honest thoughts into words here.'),
      advice: isTaglish
        ? (persona === 'practical'
            ? 'Kapag magulo ang sitwasyon, piliin muna ang isang konkretong bagay na kontrolado mo ngayon. Hindi kailangang perpekto ang unang step—basta gumagalaw ka palayo sa stress at papunta sa kalinawan.'
            : 'Hindi mo kailangang ayusin lahat ngayong gabi. Valid ang nararamdaman mo, at okay lang na maging hindi sigurado habang pinoproseso mo ang lahat. Huminga muna, at piliin ang pinaka-mabait at realistic na susunod na hakbang para sa sarili mo.')
        : 'You do not have to untangle everything in a single night. Separate what is genuinely in your hands today from what you cannot control yet, and give yourself grace while taking one steady next step.',
      actionSteps: isTaglish
        ? [
            'Isulat sa isang linya kung ano ang pinakagusto mong mangyari pagkatapos ng linggong ito.',
            'Bitawan muna ang isang bagay na hindi mo kontrolado ngayong araw.',
            'Mag-commit sa isang maliit na hakbang sa loob ng 24 oras.',
          ]
        : [
            'Write down in one sentence what peace or progress would look like this week.',
            'Let go of one worry that is outside your direct control today.',
            'Take one small, concrete step in the next 24 hours.',
          ],
      followUpQuestion: isTaglish
        ? 'Ano pa ang gusto mong idagdag o ilabas? Handa akong makinig.'
        : 'What else is on your mind about this? Feel free to share more.',
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

  async function advise(messages, persona) {
    var settings = root.ConfessionStore ? root.ConfessionStore.getSettings() : {};
    if (settings.aiProxyUrl && typeof fetch === 'function') {
      try {
        var res = await fetch(settings.aiProxyUrl + '/api/ai/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map(function (m) {
              return { role: m.role, content: m.content };
            }),
            persona: persona || 'empathetic',
          }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (_) {
        // Fall back to built-in engine
      }
    }
    return localAdvise(messages, persona || 'empathetic');
  }

  root.ConfessionAI = {
    moderate: moderate,
    react: react,
    advise: advise,
    localModerate: localModerate,
    localReact: localReact,
    localAdvise: localAdvise,
  };
})(typeof window !== 'undefined' ? window : globalThis);
