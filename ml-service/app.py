from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import re
import os

app = Flask(__name__)
CORS(app)

# ─── Load Model ───
MODEL_PATH = 'models/fake_news_pipeline.pkl'

if not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model not found at {MODEL_PATH}")
    print("Run 'python train_model.py' first to train the model.")
    exit(1)

with open(MODEL_PATH, 'rb') as f:
    pipeline = pickle.load(f)

print("Model loaded successfully.")

# ─── Category Keywords ───
CATEGORY_KEYWORDS = {
    'politics': [
        'government', 'president', 'election', 'congress', 'senate',
        'democrat', 'republican', 'vote', 'campaign', 'political',
        'trump', 'biden', 'obama', 'white house', 'minister', 'parliament'
    ],
    'health': [
        'vaccine', 'covid', 'doctor', 'hospital', 'disease', 'health',
        'medical', 'virus', 'treatment', 'drug', 'patient', 'cancer',
        'symptoms', 'pandemic', 'WHO'
    ],
    'finance': [
        'stock', 'market', 'economy', 'bank', 'investment', 'money',
        'financial', 'bitcoin', 'crypto', 'inflation', 'trade', 'tax',
        'gdp', 'recession', 'federal reserve'
    ],
    'technology': [
        'ai', 'artificial intelligence', 'tech', 'software', 'google',
        'apple', 'microsoft', 'data', 'internet', 'cyber', 'app',
        'robot', 'algorithm', 'startup'
    ]
}


def clean_text(text):
    """Clean text for model prediction."""
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def detect_category(text):
    """Simple keyword-based category detection."""
    lower = text.lower()
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        scores[cat] = sum(1 for kw in keywords if kw in lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'general'


def build_reasons(text, confidence, category, verdict):
    """Build human-readable analysis reasons."""
    reasons = []

    if verdict == 'Likely Fake':
        reasons.append(f'ML model detected {confidence}% probability of misinformation')
    elif verdict == 'Possibly Misleading':
        reasons.append(f'ML model detected moderate risk ({confidence}% fake probability)')
    else:
        reasons.append(f'ML model found low risk of misinformation ({confidence}% fake probability)')

    if category != 'general':
        reasons.append(f'Topic categorized as: {category}')

    if len(text.strip()) < 100:
        reasons.append('Short text — limited context for accurate analysis')

    return reasons


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    text = data.get('text', '')

    if not text or len(text.strip()) == 0:
        return jsonify({'error': 'No text provided'}), 400

    # Clean text for ML model
    cleaned = clean_text(text)

    # Get prediction probabilities
    proba = pipeline.predict_proba([cleaned])[0]

    # proba[0] = P(Real/class 0), proba[1] = P(Fake/class 1)
    # Adjust based on your label encoding
    fake_prob = float(proba[1]) * 100
    confidence = round(fake_prob, 1)

    # Determine verdict
    if confidence >= 60:
        verdict = 'Likely Fake'
    elif confidence >= 35:
        verdict = 'Possibly Misleading'
    else:
        verdict = 'Appears Credible'

    category = detect_category(text)
    reasons = build_reasons(text, confidence, category, verdict)

    return jsonify({
        'verdict': verdict,
        'confidence': confidence,
        'category': category,
        'highlights': [],
        'reasons': reasons
    })


@app.route('/', methods=['GET'])
def health():
    return jsonify({'status': 'ML service running'})


if __name__ == '__main__':
    print("Starting ML service on http://localhost:5001")
    app.run(port=5001, debug=True)
