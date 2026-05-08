import json
import os
import torch
import numpy as np
from typing import List, Dict, Any
from transformers import AutoTokenizer, AutoModel

class MaternalRAG:
    def __init__(self, knowledge_file: str = "app/data/maternal_knowledge.json"):
        self.knowledge_file = knowledge_file
        self.knowledge_base = []
        self.model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self.tokenizer = None
        self.model = None
        self.embeddings = None
        
        self.load_knowledge()
        self.init_model()

    def load_knowledge(self):
        if os.path.exists(self.knowledge_file):
            with open(self.knowledge_file, "r") as f:
                self.knowledge_base = json.load(f)
        else:
            # Fallback or empty
            self.knowledge_base = []

    def init_model(self):
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModel.from_pretrained(self.model_name)
            self.encode_knowledge()
        except Exception as e:
            print(f"RAG Model Init Error: {e}. Falling back to keyword search.")
            self.model = None

    def _mean_pooling(self, model_output, attention_mask):
        token_embeddings = model_output[0]
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

    def encode_knowledge(self):
        if not self.model or not self.knowledge_base:
            return
        
        texts = [f"{item['topic']}: {item['content']}" for item in self.knowledge_base]
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
        
        with torch.no_grad():
            model_output = self.model(**inputs)
            self.embeddings = self._mean_pooling(model_output, inputs["attention_mask"])

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        if not self.model or self.embeddings is None:
            # Keyword fallback
            query_lower = query.lower()
            matches = []
            for item in self.knowledge_base:
                if item["topic"].lower() in query_lower or any(t.lower() in query_lower for t in item.get("escalation_triggers", [])):
                    matches.append(item)
            return matches[:top_k]

        # Semantic Search
        inputs = self.tokenizer([query], padding=True, truncation=True, return_tensors="pt")
        with torch.no_grad():
            model_output = self.model(**inputs)
            query_embedding = self._mean_pooling(model_output, inputs["attention_mask"])

        # Cosine similarity
        cos_sim = torch.nn.functional.cosine_similarity(query_embedding, self.embeddings)
        top_indices = torch.topk(cos_sim, k=min(top_k, len(self.knowledge_base))).indices
        
        results = []
        for idx in top_indices:
            results.append(self.knowledge_base[idx.item()])
        return results

maternal_rag = MaternalRAG()
