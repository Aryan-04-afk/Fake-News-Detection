const SENSATIONALIST_WORDS = [
    'shocking', 'unbelievable', 'incredible', 'amazing', 'secret',
    'breaking', 'urgent', 'miracle', 'cure', 'conspiracy', 'exposed',
    'banned', 'warning', 'alert', 'hoax', 'scam', 'revealed', 'hidden',
    'terrifying', 'deadly', 'dangerous', 'explosive', 'bombshell'
];

const CLICKBAIT_PHRASES = [
    "you won't believe",
    "doctors don't want you to know",
    "the truth about",
    "what they're not telling you",
    "exposed",
    "goes viral",
    "will blow your mind",
    "one weird trick",
    "hate him",
    "scientists baffled",
    "this is why",
    "the real reason",
    "exposed as fraud",
    "exposed as fake"
];

function analyzeNews(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    const reasons = [];

    SENSATIONALIST_WORDS.forEach(word => {
        if (lowerText.includes(word)) {
            score += 12;
            reasons.push(`Contains sensationalist language: "${word}"`);
        }
    });

    CLICKBAIT_PHRASES.forEach(phrase => {
        if (lowerText.includes(phrase)) {
            score += 18;
            reasons.push(`Uses clickbait phrase: "${phrase}"`);
        }
    });

    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 2) {
        score += 10;
        reasons.push(`Excessive exclamation marks (${exclamationCount} found)`);
    }

    const capsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
    if (capsWords.length > 2) {
        score += 10;
        reasons.push(`Excessive ALL CAPS usage (${capsWords.length} words)`);
    }

    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 2) {
        score += 5;
        reasons.push('Multiple rhetorical questions detected');
    }

    if (text.length < 50) {
        score += 5;
        reasons.push('Very short text - limited context for analysis');
    }

    const confidence = Math.min(score, 100);

    let verdict;
    if (confidence >= 50) {
        verdict = 'Likely Fake';
    } else if (confidence >= 25) {
        verdict = 'Possibly Misleading';
    } else {
        verdict = 'Appears Credible';
    }

    return {
        verdict,
        confidence,
        reasons: reasons.length > 0 ? reasons : ['No obvious fake news indicators detected']
    };
}

module.exports = { analyzeNews };
