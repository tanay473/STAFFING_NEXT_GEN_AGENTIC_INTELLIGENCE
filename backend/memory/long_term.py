import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from google import generativeai as genai
from backend.config import settings
from backend.utils.db_watchdog import record_db_usage

logger = logging.getLogger("long_term_memory")

# Set up Gemini Key if present
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Local simulated vector database JSON path
SIM_DB_PATH = Path(settings.DATA_DIR) / "vector_db_sim.json"

class LongTermMemory:
    def __init__(self):
        self.pinecone_index = None
        if settings.USE_PINECONE and settings.PINECONE_API_KEY:
            try:
                from pinecone import Pinecone
                pc = Pinecone(api_key=settings.PINECONE_API_KEY)
                self.pinecone_index = pc.Index(settings.PINECONE_INDEX_NAME)
                logger.info("Connected to Pinecone successfully.")
            except Exception as e:
                logger.warning(f"Failed to connect to Pinecone, falling back to local simulation. Error: {e}")
                self.pinecone_index = None

    def _get_embedding(self, text: str) -> List[float]:
        """Gets vector embedding using Gemini API, or returns a mock vector if API key is missing."""
        if not settings.GEMINI_API_KEY:
            # Fallback to deterministic pseudo-random embedding vector based on text
            np.random.seed(sum(ord(c) for c in text) % 1000)
            return np.random.uniform(-1, 1, 768).tolist()
        
        try:
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_document"
            )
            return result["embedding"]
        except Exception as e:
            logger.error(f"Error calling Gemini Embeddings: {e}")
            np.random.seed(sum(ord(c) for c in text) % 1000)
            return np.random.uniform(-1, 1, 768).tolist()

    def upsert(self, doc_id: str, text: str, metadata: Dict[str, Any]) -> bool:
        """Saves a document and its embedding vector."""
        record_db_usage(writes=1)
        vector = self._get_embedding(text)
        
        if self.pinecone_index:
            try:
                self.pinecone_index.upsert(vectors=[(doc_id, vector, {**metadata, "text": text})])
                return True
            except Exception as e:
                logger.error(f"Pinecone upsert failed: {e}")

        # Local simulation fallback
        data = {}
        if SIM_DB_PATH.exists():
            try:
                with open(SIM_DB_PATH, "r") as f:
                    data = json.load(f)
            except Exception:
                data = {}

        data[doc_id] = {
            "text": text,
            "vector": vector,
            "metadata": metadata
        }

        with open(SIM_DB_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return True

    def query(self, query_text: str, filter_dict: Optional[Dict[str, Any]] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        """Queries for top K most semantically similar documents."""
        record_db_usage(reads=1)
        query_vector = self._get_embedding(query_text)

        if self.pinecone_index:
            try:
                res = self.pinecone_index.query(
                    vector=query_vector,
                    top_k=top_k,
                    include_metadata=True,
                    filter=filter_dict
                )
                results = []
                for match in res.get("matches", []):
                    results.append({
                        "id": match.get("id"),
                        "score": match.get("score"),
                        "text": match.get("metadata", {}).get("text", ""),
                        "metadata": {k: v for k, v in match.get("metadata", {}).items() if k != "text"}
                    })
                return results
            except Exception as e:
                logger.error(f"Pinecone query failed: {e}")

        # Local simulation fallback
        if not SIM_DB_PATH.exists():
            return []

        try:
            with open(SIM_DB_PATH, "r") as f:
                data = json.load(f)
        except Exception:
            return []

        scored_matches = []
        q_vec = np.array(query_vector)
        q_norm = np.linalg.norm(q_vec)

        for doc_id, doc in data.items():
            # Apply basic filter matching
            if filter_dict:
                matches_filter = True
                doc_meta = doc.get("metadata", {})
                for k, v in filter_dict.items():
                    if doc_meta.get(k) != v:
                        matches_filter = False
                        break
                if not matches_filter:
                    continue

            d_vec = np.array(doc["vector"])
            d_norm = np.linalg.norm(d_vec)
            
            if q_norm == 0 or d_norm == 0:
                similarity = 0.0
            else:
                similarity = float(np.dot(q_vec, d_vec) / (q_norm * d_norm))
            
            scored_matches.append({
                "id": doc_id,
                "score": similarity,
                "text": doc["text"],
                "metadata": doc["metadata"]
            })

        # Sort by similarity score descending
        scored_matches.sort(key=lambda x: x["score"], reverse=True)
        return scored_matches[:top_k]

# Global single instance
long_term_memory = LongTermMemory()
