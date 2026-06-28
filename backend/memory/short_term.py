import json
import logging
from typing import Dict, Any, Optional
from backend.config import settings

logger = logging.getLogger("short_term_memory")

# In-memory fallback dictionary
_in_memory_store: Dict[str, str] = {}

class ShortTermMemory:
    def __init__(self):
        self.redis_client = None
        if settings.USE_REDIS:
            try:
                import redis
                self.redis_client = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    decode_responses=True,
                    socket_timeout=2.0
                )
                self.redis_client.ping()
                logger.info("Connected to Redis successfully.")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis, falling back to in-memory store. Error: {e}")
                self.redis_client = None

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                return json.loads(val) if val else None
            except Exception as e:
                logger.error(f"Redis get failed: {e}")
        
        # Fallback
        val = _in_memory_store.get(key)
        return json.loads(val) if val else None

    def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        serialized = json.dumps(value)
        if self.redis_client:
            try:
                if expire_seconds:
                    self.redis_client.setex(key, expire_seconds, serialized)
                else:
                    self.redis_client.set(key, serialized)
                return True
            except Exception as e:
                logger.error(f"Redis set failed: {e}")

        # Fallback
        _in_memory_store[key] = serialized
        return True

    def delete(self, key: str) -> bool:
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return True
            except Exception as e:
                logger.error(f"Redis delete failed: {e}")

        # Fallback
        if key in _in_memory_store:
            del _in_memory_store[key]
            return True
        return False

    def clear(self) -> bool:
        global _in_memory_store
        _in_memory_store.clear()
        if self.redis_client:
            try:
                self.redis_client.flushdb()
                logger.info("Cleared Redis short term memory.")
                return True
            except Exception as e:
                logger.error(f"Redis flushdb failed: {e}")
        logger.info("Cleared in-memory short term cache store.")
        return True

# Global single instance
session_memory = ShortTermMemory()
