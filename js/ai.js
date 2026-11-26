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

  function detectTagalog(text) {
    return /\b(ako|ko|ka|mo|naman|kasi|pero|hindi|di|yung|lang|sana|paano|mahal|pagod|trabaho|pamilya|gusto|ayoko|nahihirapan|talaga|sobra|ba|bakit|siya|niya|masaya|malungkot|galit|inis|kilig|iyak|lungkot|saya|kaba|takot)\b/i.test(
      text
    );
  }

  function detectEmotion(text) {
    var lower = (text || '').toLowerCase().trim();
    if (!lower) return 'neutral';

    if (/\b(suicide|kill myself|end my life|magpakamatay|ayoko na mabuhay|self-harm|hurt myself)\b/i.test(lower)) {
      return 'crisis';
    }
    if (/\b(happy|masaya|saya|excited|grateful|thankful|blessed|yay|proud|good news|passed|nanalo|promoted|joy|smiling|tuwa|natutuwa|awesome|great day|best day|win|won)\b/.test(lower)) {
      return 'happy';
    }
    if (/\b(sad|malungkot|lungkot|cry|crying|iyak|umiiyak|heartbroken|broken|lonely|alone|hurt|sakit|masakit|miss you|miss ko|depressed|down|empty|regret|sorry|guilt|disappointed)\b/.test(lower)) {
      return 'sad';
    }
    if (/\b(love|inlove|in love|crush|kilig|mahal|jowa|partner|boyfriend|girlfriend|feelings|confess|pag-ibig|ligaw|date|kiss|sweet)\b/.test(lower)) {
      return 'love';
    }
    if (/\b(angry|mad|galit|inis|nakakainis|bwisit|frustrated|hate|toxic|unfair|annoyed|stressed|burnout|furious|pissed)\b/.test(lower)) {
      return 'angry';
    }
    if (/\b(anxious|anxiety|panic|overthink|overthinking|worried|scared|nervous|takot|kaba|kinakabahan|uncertain|confused|lost)\b/.test(lower)) {
      return 'anxious';
    }
    if (/\b(tired|exhausted|pagod|drained|sleepy|antok|burnout|overwhelmed|trabaho|work|boss|exam|thesis|aral)\b/.test(lower)) {
      return 'tired';
    }
    return 'neutral';
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function localAdvise(messages, persona) {
    var list = Array.isArray(messages) ? messages : [];
    var userMessages = list
      .filter(function (m) {
        return m && m.role === 'user' && m.content;
      })
      .map(function (m) {
        return String(m.content);
      });

    var lastUser = userMessages[userMessages.length - 1] || '';
    var combined = userMessages.join(' ').toLowerCase();
    var isTaglish = detectTagalog(combined) || persona === 'taglish_bestie';
    var isFollowUp = userMessages.length > 1;

    var emotion = detectEmotion(lastUser);
    if (emotion === 'neutral' && isFollowUp) {
      emotion = detectEmotion(combined);
    }

    if (emotion === 'crisis') {
      return {
        emotion: 'crisis',
        moodEmoji: '🫂',
        summary: isTaglish
          ? 'Sobrang bigat ng dala mo ngayon, at hindi mo ito kailangang harapin mag-isa.'
          : 'You are carrying something deeply painful right now, and you do not have to face it alone.',
        advice: isTaglish
          ? 'Mahalaga ang buhay mo. Pakiusap, mag-reach out ka agad sa pinagkakatiwalaang kaibigan, pamilya, o crisis hotline para may makasama at makausap ka ngayon.'
          : 'Your life matters, and you deserve immediate care. Please reach out right now to someone you trust or a trained crisis helpline.',
        actionSteps: isTaglish
          ? [
              'Tumawag sa NCMH Crisis Hotline: 1553 o 0917-899-8727 / 0966-351-4518.',
              'Kung nasa ibang bansa, tumawag o mag-text sa 988 (US/Canada) o local emergency number.',
              'Mag-message sa isang taong pinagkakatiwalaan mo: "Kailangan ko ng kausap ngayon."',
            ]
          : [
              'Call or text 988 (US/Canada), 1553 (Philippines NCMH), or local emergency services.',
              'Message one trusted friend or family member right now.',
              'Stay in a safe space and focus only on the next hour.',
            ],
        followUpQuestion: isTaglish
          ? 'May isang tao ka bang pwedeng tawagan o i-message ngayon?'
          : 'Is there one person you feel safe calling or texting right now?',
      };
    }

    if (emotion === 'happy') {
      return {
        emotion: 'happy',
        moodEmoji: pick(['🎉', '✨', '☀️']),
        summary: isTaglish
          ? 'Ang sarap sa pakiramdam na masaya ka ngayon—deserve mo iyan!'
          : 'It is wonderful to hear you feeling happy—you truly deserve this moment!',
        advice: isTaglish
          ? 'I-enjoy at i-savor mo nang buo ang saya na ito nang walang pag-aalinlangan. Madalas mabilis lumipas ang good days, kaya itatak mo sa isip mo kung ano ang nagpasaya sa iyo ngayon para may babalikan kang lakas sa mga araw na pagod ka.'
          : 'Let yourself soak in this joy fully without rushing past it. Good moments are fuel for harder days—take a second to notice what made today feel bright and share a bit of that warmth with someone you care about.',
        actionSteps: isTaglish
          ? [
              'Isulat o i-save sa memory mo ang dahilan ng ngiti mo ngayong araw.',
              'I-celebrate kahit sa maliit na paraan—paboritong pagkain, kanta, o pahinga.',
              'Mag-share ng mabuting salita sa isang kaibigan para dumoble ang good vibes.',
            ]
          : [
              'Pause for 30 seconds and savor exactly what made you feel happy today.',
              'Celebrate in a small way—your favorite treat, song, or a relaxing break.',
              'Pass a kind word to someone else to ripple the good energy forward.',
            ],
        followUpQuestion: isTaglish
          ? 'Ano ang pinaka-nagpasaya sa iyo ngayon? Kwento ka pa!'
          : 'What sparked this happy moment for you today? Tell me more!',
      };
    }

    if (emotion === 'sad') {
      return {
        emotion: 'sad',
        moodEmoji: '🫂',
        summary: isTaglish
          ? 'Yakap nang mahigpit—valid ang lungkot mo at hindi mo kailangang magpanggap na okay agad.'
          : 'Sending you a quiet hug—your sadness is valid, and you do not have to force a smile right now.',
        advice: isTaglish
          ? 'Kapag mabigat ang dibdib, hindi kailangang ayusin lahat ngayong gabi. Hayaan mong mailabas ang nararamdaman mo, maging mabait ka sa sarili mo, at tandaan na ang ulan na ito ay lilipas din kahit mabagal.'
          : 'When sadness hits hard, you do not have to fix everything tonight. Give yourself permission to feel it gently without judging yourself—heavy weather passes even when it feels slow.',
        actionSteps: isTaglish
          ? [
              'Uminom ng tubig, huminga nang malalim, at magpahinga muna nang walang guilt.',
              'Ilagay sa salita dito kung ano ang nagpapabigat sa loob mo—handa akong makinig.',
              'Mag-message sa isang taong komportable ka kahit simpleng "kamusta" lang.',
            ]
          : [
              'Drink some water, unclench your shoulders, and give yourself permission to rest.',
              'Put what is hurting into words here—getting it out of your head lightens the weight.',
              'Do one tiny comforting thing tonight (warm shower, soft music, or early sleep).',
            ],
        followUpQuestion: isTaglish
          ? 'Gusto mo bang ikwento kung ano ang nagpalungkot sa iyo? Andito lang ako.'
          : 'Do you want to share what has been making you feel sad? I am right here listening.',
      };
    }

    if (emotion === 'love') {
      return {
        emotion: 'love',
        moodEmoji: '🫶',
        summary: isTaglish
          ? 'Kilig man o nakakakaba, ang ganda ng pusong marunong magmahal nang totoo.'
          : 'Whether it feels exciting or scary, caring deeply about someone takes real courage.',
        advice: isTaglish
          ? 'Piliin mo ang honesty na may respeto—sa kanya at lalo na sa sarili mo. Kung nagdadalawang-isip ka, tandaan na mas magaan ang malinaw na sagot kaysa sa walang katapusang "what if."'
          : 'Honor your feelings with honesty and self-respect. You do not need to rush—move at a pace that protects both your kindness and your peace of mind.',
        actionSteps: isTaglish
          ? [
              'Linawin sa sarili mo kung ano ang gusto mong sabihin nang walang pressure.',
              'Pansinin kung pareho kayo ng effort at respeto sa isa’t isa.',
              'Huwag kalimutang alagaan ang sarili mo habang nagmamahal ng iba.',
            ]
          : [
              'Clarify what you truly want to express without pressuring the outcome.',
              'Notice whether care and respect are mutual.',
              'Keep your own peace and identity anchored while opening your heart.',
            ],
        followUpQuestion: isTaglish
          ? 'Ano ang pinaka-gusto mong sabihin sa kanya kung walang takot?'
          : 'If fear were not in the way, what would you want to tell them?',
      };
    }

    if (emotion === 'angry') {
      return {
        emotion: 'angry',
        moodEmoji: '🌊',
        summary: isTaglish
          ? 'Ramdam ko ang init at pagka-frustrate mo—may dahilan kung bakit ka napuno.'
          : 'I hear your frustration—it makes sense to feel fired up when boundaries get crossed.',
        advice: isTaglish
          ? 'Huwag kang magpadala sa galit sa desisyong pagsisisihan mo bukas. Palipasin muna ang unang bugso ng init ng ulo, tapos gamitin mo ang energy na iyan para mag-set ng malinaw at kalmadong boundary.'
          : 'Your anger is a signal that something mattered or crossed a line. Let the sharpest wave cool down first so your next move protects your peace instead of creating regret.',
        actionSteps: isTaglish
          ? [
              'Huminga nang mabagal ng 5 beses bago mag-reply o mag-desisyon.',
              'Isulat muna lahat ng inis mo dito para lumabas ang tensyon.',
              'Pag kalmado na, sabihin nang direkta at maayos kung ano ang hindi mo na tatanggapin.',
            ]
          : [
              'Pause for 5 slow breaths before replying to anyone while heated.',
              'Let the tension out safely here or take a brisk 5-minute walk.',
              'Once steady, decide on one firm boundary you want to hold.',
            ],
        followUpQuestion: isTaglish
          ? 'Ano ang nangyari na nagpa-trigger sa inis o stress mo?'
          : 'What happened that pushed you past your limit today?',
      };
    }

    if (emotion === 'anxious') {
      return {
        emotion: 'anxious',
        moodEmoji: '🫧',
        summary: isTaglish
          ? 'Ramdam ko ang kaba at pag-o-overthink mo—mag-slow down muna tayo sandali.'
          : 'When your thoughts race, everything feels ten times heavier—let us slow this down together.',
        advice: isTaglish
          ? 'Hindi mo kailangang i-predict o ayusin ang buong bukas ngayong gabi. Ibalik ang atensyon mo sa kaya mo lang gawin ngayong oras na ito—kapag kumalma ang isip, mas malinaw na rin ang daan.'
          : 'You do not have to solve every "what if" right now. Anchor yourself in what is true in this exact minute, and shrink the problem down to one small step.',
        actionSteps: isTaglish
          ? [
              'Subukan ang 4-4-4 breathing (inhale 4s, hold 4s, exhale 4s) nang tatlong beses.',
              'Paghiwalayin ang totoong nangyayari ngayon sa kinakatakutan mo pa lang.',
              'Pumili ng isang maliit na bagay na kontrolado mo at iyon lang muna ang gawin.',
            ]
          : [
              'Do three rounds of 4-4-4 breathing (4s in, 4s hold, 4s out).',
              'Separate what is actually happening now from worst-case predictions.',
              'Pick one small controllable step and leave the rest for tomorrow.',
            ],
        followUpQuestion: isTaglish
          ? 'Anong isang iniisip ang paulit-ulit na umiikot sa utak mo ngayon?'
          : 'What is the one worry looping the loudest in your mind right now?',
      };
    }

    if (emotion === 'tired') {
      return {
        emotion: 'tired',
        moodEmoji: '🌙',
        summary: isTaglish
          ? 'Halatang pagod na pagod ka na—hindi kahinaan ang magpahinga.'
          : 'It sounds like you have been running on empty—rest is a need, not a weakness.',
        advice: isTaglish
          ? 'Huwag kang mag-desisyon ng mabibigat habang sagad ang pagod mo. Bawasan muna ang hindi urgent ngayong araw at bigyan ang katawan at utak mo ng totoong pahinga.'
          : 'Avoid judging your whole life when you are exhausted. Drop one non-essential task today and let yourself recharge before tackling the next big thing.',
        actionSteps: isTaglish
          ? [
              'Mag-set ng alarm para matulog o mag-off ng screen nang mas maaga ngayong gabi.',
              'Piliin lang ang 1 pinaka-importanteng kailangang tapusin—i-park muna ang iba.',
              'Uminom ng tubig at kumain nang maayos kahit busy.',
            ]
          : [
              'Pick only one must-do item and postpone the rest without guilt.',
              'Give yourself a screen-free break or earlier bedtime tonight.',
              'Hydrate and check in with your body before pushing harder.',
            ],
        followUpQuestion: isTaglish
          ? 'Ano ang pinaka-nakakaubos ng lakas mo nitong mga nakaraang araw?'
          : 'What has been draining your energy the most lately?',
      };
    }

    return {
      emotion: 'neutral',
      moodEmoji: isFollowUp ? '💡' : '✨',
      summary: isTaglish
        ? 'Salamat sa pag-share ng nasa isip mo—malaya kang maglabas ng saloobin dito.'
        : 'Thank you for sharing what is on your mind—you are heard here without judgment.',
      advice: isTaglish
        ? 'Kapag nailalabas natin ang totoong iniisip natin, mas madaling makita ang susunod na hakbang. Piliin mo ang isang maliit at mabait na desisyon para sa sarili mo ngayong araw.'
        : 'Putting honest thoughts into words creates breathing room and clarity. Take one calm, intentional step forward today and be kind to yourself along the way.',
      actionSteps: isTaglish
        ? [
            'Mag-pause sandali at tanungin ang sarili: ano ang pinaka-kailangan ko ngayon?',
            'Pumili ng isang maliit na hakbang na kaya mong gawin sa loob ng 24 oras.',
            'Kung gusto mo pang magkwento, i-send lang dito—handa akong magbigay ng payo.',
          ]
        : [
            'Pause and ask: what do I need most right now—clarity, rest, or action?',
            'Choose one small step you can take within the next 24 hours.',
            'Keep typing anytime if you want to talk it through further.',
          ],
      followUpQuestion: isTaglish
        ? 'Ano pa ang gusto mong sabihin? Handa akong makinig at magpayo.'
        : 'Would you like to share a bit more so I can give more tailored advice?',
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

  async function advise(messages, persona) {
    var settings = root.ConfessionStore ? root.ConfessionStore.getSettings() : {};
    var lastUser = '';
    for (var i = (messages || []).length - 1; i >= 0; i -= 1) {
      if (messages[i] && messages[i].role === 'user') {
        lastUser = messages[i].content;
        break;
      }
    }
    var detected = detectEmotion(lastUser);

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
          var data = await res.json();
          data.emotion = data.emotion || detected;
          return data;
        }
      } catch (_) {
        // Fall back to built-in engine
      }
    }
    return localAdvise(messages, persona || 'empathetic');
  }

  root.ConfessionAI = {
    detectEmotion: detectEmotion,
    moderate: moderate,
    advise: advise,
    localModerate: localModerate,
    localAdvise: localAdvise,
  };
})(typeof window !== 'undefined' ? window : globalThis);
