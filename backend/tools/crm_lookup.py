import sqlite3
import json
import logging
from typing import List, Dict, Any, Optional
from backend.config import settings

logger = logging.getLogger("crm_lookup")

def _get_connection():
    return sqlite3.connect(settings.SQLITE_DB_PATH)

def get_candidate_by_id(candidate_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a single candidate by ID."""
    conn = _get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    c = dict(row)
    c["skills"] = json.loads(c["skills"])
    c["job_history"] = json.loads(c["job_history"])
    return c

def search_candidates_crm(skills: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Finds candidates from CRM. If skills are provided, fetches candidates
    whose skill sets have any overlap.
    """
    conn = _get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM candidates WHERE status = 'Active'")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        c = dict(r)
        c["skills"] = json.loads(c["skills"])
        c["job_history"] = json.loads(c["job_history"])
        
        # Check skill overlap if filter is set
        if skills:
            skills_lower = [s.lower() for s in skills]
            cand_skills_lower = [s.lower() for s in c["skills"]]
            # If there is at least one overlapping skill, include
            overlap = set(skills_lower).intersection(set(cand_skills_lower))
            if not overlap:
                continue
        results.append(c)

    return results

def get_client_by_name(client_name: str) -> Optional[Dict[str, Any]]:
    """Gets client information including stated preferences by company name."""
    conn = _get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients WHERE name LIKE ?", (f"%{client_name}%",))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    cl = dict(row)
    cl["preferences"] = json.loads(cl["preferences"])
    return cl

def get_client_placements_and_history(client_id: str) -> List[Dict[str, Any]]:
    """Pulls historical placements at a specific client to check rates and statuses."""
    conn = _get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM placements WHERE client_id = ?", (client_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
