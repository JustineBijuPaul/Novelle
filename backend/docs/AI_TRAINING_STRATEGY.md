# Novelle AI Training & Dataset Strategy

To evolve from the current RAG-based prototype to a high-fidelity Medical Assistant, the following strategy is implemented:

## 1. Datasets for Fine-tuning
We prioritize the following datasets for clinical reasoning and conversational quality:

| Dataset | Purpose | Source |
|---------|---------|--------|
| **Local LLM Dataset** | Core training data | `/ml/datasets/llm dataset/` |
| **ChatDoctor (Maternal)** | Conversational dialogue | Extracted 10,786 samples from ChatDoctor |
| **MedQuAD (Maternal)** | Fact-based Q&A | Extracted 68 specialized maternal Q&A pairs |
| **MIMIC-IV / MTSamples** | Clinical reasoning | Clinical notes from local CSV/Parquet |

## 2. Model Selection
- **Base Model**: Mistral-7B-v0.3 or Llama-3-8B.
- **Quantization**: 4-bit (bitsandbytes) to enable training on consumer-grade GPUs.
- **Fine-tuning Method**: QLoRA (Quantized Low-Rank Adaptation) for parameter-efficient tuning.

## 3. Architecture: RAG + Fine-tuning
Even with a fine-tuned model, we maintain **RAG (Retrieval Augmented Generation)** to ensure:
- **Factuality**: Verifiable medical facts from guidelines.
- **Up-to-date Knowledge**: Easy to update guidelines without retraining (Current: 73 specialized items).
- **Grounding**: Preventing hallucinations by injecting context.

## 4. Safety Guardrails (Active)
- **Emergency Detection**: High BP, reduced fetal movement, and mental health crisis detection.
- **Escalation**: Immediate redirection to human clinicians for high-risk flags.
- **SHAP Integration**: Explaining why a risk score is high to provide transparent guidance.

## 5. Implementation Status
- [x] Phase 1: Prototype (RAG + Safety Engine)
- [ ] Phase 2: Synthetic Data Generation (SDV)
- [ ] Phase 3: Domain-Specific Fine-tuning
- [ ] Phase 4: Clinical Validation
