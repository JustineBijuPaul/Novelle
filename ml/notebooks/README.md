# ML Model Training Notebooks

This directory contains Jupyter notebooks for training all three Novelle risk prediction models.

## Notebooks

| Notebook | Model | Algorithm | Target |
|----------|-------|-----------|--------|
| `01_mental_health_model.ipynb` | Mental Health Risk | XGBoost | Depression, Anxiety Risk |
| `02_physical_health_model.ipynb` | Physical Health Risk | Ensemble (XGB+RF+LR) | Maternal Complications |
| `03_fetal_health_model.ipynb` | Fetal Health Risk | LightGBM | Fetal Distress Indicators |

---

## Quick Start

### 1. Set Up Python Environment

```bash
cd ml

# Create virtual environment (if not using backend venv)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install pandas numpy scikit-learn==1.8.0 xgboost lightgbm shap imbalanced-learn matplotlib seaborn joblib jupyter
```

### 2. Launch Jupyter

```bash
jupyter notebook notebooks/
```

### 3. Run Notebooks in Order

1. `01_mental_health_model.ipynb`
2. `02_physical_health_model.ipynb`
3. `03_fetal_health_model.ipynb`

Model artifacts will be saved to `backend/app/ml/models/`.

---

## Datasets

### Option A: Use Existing Synthetic Data (Recommended)

The project already includes synthetic datasets in `ml/datasets/`:

| File | Records | Description |
|------|---------|-------------|
| `synthetic_mental_health.csv` | ~1,000+ | PHQ-9, GAD-7, mood, stress, risk labels |
| `synthetic_health_logs.csv` | ~1,000+ | BP, blood sugar, symptoms, fetal movements |
| `synthetic_profiles.csv` | ~100+ | User demographics, pregnancy history |

These synthetic datasets are ready to use — **no download required**.

---

### Option B: Download Public Datasets

For enhanced training with real-world data distributions, download these datasets:

#### 1. Maternal Health Risk Dataset (Physical Health)

**Source:** [Kaggle - Maternal Health Risk Data Set](https://www.kaggle.com/datasets/csafrit2/maternal-health-risk-data-set)

```bash
# Install Kaggle CLI
pip install kaggle

# Configure Kaggle API (one-time setup)
# 1. Go to https://www.kaggle.com/account
# 2. Click "Create New API Token" → downloads kaggle.json
# 3. Move to ~/.kaggle/
mkdir -p ~/.kaggle
mv ~/Downloads/kaggle.json ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

# Download dataset
cd ml/datasets
kaggle datasets download -d csafrit2/maternal-health-risk-data-set
unzip maternal-health-risk-data-set.zip -d maternal_health/
```

**Contains:** Age, SystolicBP, DiastolicBP, BS (blood sugar), BodyTemp, HeartRate, RiskLevel

**Feature Mapping:**
| Dataset Column | Our Feature |
|---------------|-------------|
| Age | `age` |
| SystolicBP | `bp_systolic` |
| DiastolicBP | `bp_diastolic` |
| BS | `blood_sugar_fasting` |
| RiskLevel | `physical_risk_level` (target) |

---

#### 2. Fetal Health Classification Dataset

**Source:** [Kaggle - Fetal Health Classification (CTG)](https://www.kaggle.com/datasets/andrewmvd/fetal-health-classification)

```bash
cd ml/datasets
kaggle datasets download -d andrewmvd/fetal-health-classification
unzip fetal-health-classification.zip -d fetal_health/
```

**Contains:** 2,126 records from Cardiotocograms (CTG) with 21 features

**Feature Mapping:**
| Dataset Feature | Our Feature |
|----------------|-------------|
| accelerations | Proxy for `fetal_movement_count` |
| abnormal_short_term_variability | `growth_abnormality_risk` indicator |
| fetal_health (1/2/3) | `fetal_risk_level` (LOW/MEDIUM/HIGH) |

---

#### 3. Mental Health Datasets

##### DAIC-WOZ Depression Database
**Source:** [USC Institute for Creative Technologies](https://dcapswoz.ict.usc.edu/)
- Requires research agreement
- Contains PHQ-8 scores from clinical interviews

##### Depression and Anxiety in Twitter
**Source:** [Kaggle - Sentimental Analysis for Tweets](https://www.kaggle.com/datasets/gargmanas/sentimental-analysis-for-tweets)

```bash
cd ml/datasets
kaggle datasets download -d gargmanas/sentimental-analysis-for-tweets
unzip sentimental-analysis-for-tweets.zip -d twitter_mental_health/
```

---

#### 4. India-Specific Datasets (For Localization)

##### NFHS-5 (National Family Health Survey)
**Source:** [DHS Program](https://dhsprogram.com/data/)
- Registration required (free for research)
- Download India DHS 2019-21

##### DLHS (District Level Household Survey)
**Source:** [IIPS Mumbai](http://rchiips.org/DLHS.html)
- Contains rural-urban maternal health disparities

---

### Option C: Generate More Synthetic Data

Use SDV (Synthetic Data Vault) to generate more training data:

```python
# Install SDV
pip install sdv

# Generate synthetic data
from sdv.single_table import GaussianCopulaSynthesizer
import pandas as pd

# Load existing data as template
real_data = pd.read_csv('datasets/synthetic_health_logs.csv')

# Train synthesizer
synthesizer = GaussianCopulaSynthesizer(metadata)
synthesizer.fit(real_data)

# Generate 10,000 synthetic records
synthetic_data = synthesizer.sample(num_rows=10000)
synthetic_data.to_csv('datasets/synthetic_health_logs_expanded.csv', index=False)
```

---

## Model Artifacts

After training, these files are saved to `backend/app/ml/models/`:

### Mental Health Model
- `mental_health_xgb.joblib` — XGBoost classifier
- `mental_health_scaler.joblib` — StandardScaler
- `mental_health_label_encoder.joblib` — LabelEncoder

### Physical Health Model
- `physical_health_ensemble.joblib` — XGBoost/Ensemble model
- `physical_health_scaler.joblib` — StandardScaler
- `physical_health_label_encoder.joblib` — LabelEncoder

### Fetal Health Model
- `fetal_health_lgbm.joblib` — LightGBM classifier
- `fetal_health_scaler.joblib` — StandardScaler
- `fetal_health_label_encoder.joblib` — LabelEncoder

---

## Evaluation Reports

Training generates reports in `ml/reports/`:
- `evaluation_metrics.json` — All model metrics
- `*_confusion_matrix.png` — Confusion matrices
- `*_feature_importance.png` — Feature rankings
- `*_shap_summary.png` — SHAP explainability plots

---

## Expected Performance

| Model | Accuracy | F1 (Weighted) | AUC-ROC |
|-------|----------|---------------|---------|
| Mental Health (XGBoost) | > 0.90 | > 0.88 | > 0.98 |
| Physical Health (Ensemble) | > 0.83 | > 0.82 | > 0.95 |
| Fetal Health (LightGBM) | > 0.93 | > 0.89 | > 0.98 |

---

## Tips

1. **GPU Acceleration**: For faster XGBoost training:
   ```python
   xgb.XGBClassifier(tree_method='gpu_hist', gpu_id=0)
   ```

2. **Hyperparameter Tuning**: Use full `param_grid` (not `reduced_grid`) for production models

3. **Cross-Validation**: Notebooks use 5-fold stratified CV — increase to 10 for final models

4. **Class Imbalance**: SMOTE is applied automatically; consider ADASYN for highly imbalanced data

---

## Disclaimer

⚠️ **These models predict RISK LIKELIHOOD only — NOT medical diagnoses.**

All outputs must be accompanied by:
> "This is a risk likelihood estimate — not a medical diagnosis. Please consult your doctor."
