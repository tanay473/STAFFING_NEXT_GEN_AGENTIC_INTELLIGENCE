import sqlite3
import logging
from typing import Dict, Any
from backend.config import settings

logger = logging.getLogger("salary_benchmark")

def get_salary_benchmark(role_name: str, location: str) -> Dict[str, float]:
    """Retrieves typical market rates for a role in a location from SQLite database."""
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Try exact match
    cursor.execute("""
        SELECT min_salary, max_salary 
        FROM salary_benchmarks 
        WHERE role_name LIKE ? AND location LIKE ?
    """, (f"%{role_name}%", f"%{location}%"))
    row = cursor.fetchone()
    
    # Fallback to role name only
    if not row:
        cursor.execute("""
            SELECT min_salary, max_salary 
            FROM salary_benchmarks 
            WHERE role_name LIKE ?
        """, (f"%{role_name}%",))
        row = cursor.fetchone()
        
    conn.close()

    if row:
        res = dict(row)
        return {
            "min_salary": res["min_salary"],
            "max_salary": res["max_salary"],
            "source": "CRM Benchmark Database"
        }
    
    # Generic default fallback
    logger.warning(f"No salary benchmark found for {role_name} in {location}. Using system fallback.")
    return {
        "min_salary": 90000.0,
        "max_salary": 130000.0,
        "source": "Standard Fallback Default"
    }
