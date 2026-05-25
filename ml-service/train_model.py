import pandas as pd
import re
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

# ─── Load LIAR Dataset ───
LIAR_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'Fake_News_Detection-master')
train_file = os.path.join(LIAR_PATH, 'train.csv')
test_file = os.path.join(LIAR_PATH, 'test.csv')
valid_file = os.path.join(LIAR_PATH, 'valid.csv')

if os.path.exists(train_file):
    train_df = pd.read_csv(train_file)
    test_df = pd.read_csv(test_file)
    valid_df = pd.read_csv(valid_file)
    data = pd.concat([train_df, test_df, valid_df], ignore_index=True)
    print(f"Loaded LIAR dataset: {data.shape[0]} rows")
else:
    print("ERROR: LIAR dataset not found at", LIAR_PATH)
    exit(1)

# ─── Map labels: FALSE=1 (Fake), TRUE=0 (Real) ───
data['label'] = data['Label'].map({'FALSE': 1, 'TRUE': 0})
data = data.dropna(subset=['label'])
data['label'] = data['label'].astype(int)
print(f"Label distribution:\n{data['label'].value_counts()}")

# ─── Text column ───
data['combined_text'] = data['Statement'].fillna('')

# ─── Clean text ───
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

data['clean_text'] = data['combined_text'].apply(clean_text)
data = data[data['clean_text'].str.len() > 10]
print(f"After cleaning: {data.shape[0]} rows")

# ─── Split Data ───
X = data['clean_text']
y = data['label']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"Training set: {len(X_train)}, Test set: {len(X_test)}")

# ─── Build Pipeline ───
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(max_features=10000, ngram_range=(1, 2), stop_words='english')),
    ('clf', LogisticRegression(max_iter=1000, C=1.0))
])

print("\nTraining model...")
pipeline.fit(X_train, y_train)

# ─── Evaluate ───
y_pred = pipeline.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\nTest Accuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Real', 'Fake']))

# ─── Save Model ───
os.makedirs('models', exist_ok=True)
model_path = 'models/fake_news_pipeline.pkl'
with open(model_path, 'wb') as f:
    pickle.dump(pipeline, f)

print(f"\nModel saved to {model_path}")
print("You can now run: python app.py")
