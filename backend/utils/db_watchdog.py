import os
import json
import logging
import sqlite3
from pathlib import Path
from backend.config import settings
from backend.memory.short_term import session_memory

logger = logging.getLogger("db_watchdog")

# Database limits for Demo Sandbox
MAX_RUS = 1000000          # 1 Million Read Units
MAX_WUS = 2000000          # 2 Million Write Units
MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024 # 2 GB

TRACKER_FILE = Path(settings.DATA_DIR) / "db_usage_tracker.json"
SIM_DB_PATH = Path(settings.DATA_DIR) / "vector_db_sim.json"

def _load_tracker():
    if TRACKER_FILE.exists():
        try:
            with open(TRACKER_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"rus": 0, "wus": 0}

def _save_tracker(tracker):
    try:
        with open(TRACKER_FILE, "w") as f:
            json.dump(tracker, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save DB usage tracker: {e}")

def get_directory_size(path: Path) -> int:
    """Calculates the total size of files inside the data directory."""
    total_size = 0
    if path.exists():
        for f in path.glob('**/*'):
            if f.is_file():
                total_size += f.stat().st_size
    return total_size

def record_db_usage(reads: int = 0, writes: int = 0):
    """
    Increments RU and WU metrics, calculates current storage usage,
    and resets all caches/databases if any limits are exceeded.
    """
    tracker = _load_tracker()
    tracker["rus"] = tracker.get("rus", 0) + reads
    tracker["wus"] = tracker.get("wus", 0) + writes
    
    # Calculate storage size
    data_dir_size = get_directory_size(Path(settings.DATA_DIR))
    
    # Save usage
    _save_tracker(tracker)
    
    # Check if limits exceeded
    if (tracker["rus"] >= MAX_RUS or 
        tracker["wus"] >= MAX_WUS or 
        data_dir_size >= MAX_STORAGE_BYTES):
        
        logger.critical(
            f"SANDBOX LIMIT EXCEEDED! RUs: {tracker['rus']}/{MAX_RUS}, "
            f"WUs: {tracker['wus']}/{MAX_WUS}, "
            f"Storage: {data_dir_size}/{MAX_STORAGE_BYTES} bytes. "
            f"Triggering automated cleanup."
        )
        clear_all_demo_cache_and_db()

def clear_all_demo_cache_and_db():
    """Clears vector database simulation, short-term memory, and re-seeds crm.db."""
    logger.info("Executing automated database cache & DB reset...")
    
    # 1. Reset short term session memory
    session_memory.clear()
    
    # 2. Reset vector database simulation json
    if SIM_DB_PATH.exists():
        try:
            SIM_DB_PATH.unlink()
            logger.info("Cleared local vector database simulation cache.")
        except Exception as e:
            logger.error(f"Failed to clear vector simulation: {e}")
            
    # 3. Reset and Re-seed SQLite crm.db
    try:
        from scripts.seed_sqlite import seed_database
        seed_database()
        logger.info("Re-seeded crm.db SQLite database successfully.")
    except Exception as e:
        logger.error(f"Failed to re-seed SQLite crm.db: {e}")
        
    # 4. Reset usage tracker metrics
    _save_tracker({"rus": 0, "wus": 0})
    logger.info("Usage tracker counters reset to zero.")
