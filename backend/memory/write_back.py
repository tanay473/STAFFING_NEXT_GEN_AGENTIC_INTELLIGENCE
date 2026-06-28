import sqlite3
import uuid
import datetime
import logging
from backend.config.settings import SQLITE_DB_PATH
from backend.memory.long_term import long_term_memory
from backend.models.action_card import ActionCard

logger = logging.getLogger("write_back")

def write_back_decision(action_card: ActionCard, decision: str, notes: str = "", edits: str = ""):
    """
    Closes the feedback loop by writing recruiter decision back to long-term memory and CRM databases.
    - decision: 'Approved', 'Rejected', 'Edited', 'Skipped'
    - notes: Rejection reason or recruiter feedback comments
    - edits: If edited, contains the updated outreach draft
    """
    timestamp = datetime.datetime.utcnow().isoformat()
    
    # 1. Update the local SQLite CRM db with the feedback
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    feedback_id = f"FEED-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
        INSERT INTO feedback (id, job_id, candidate_id, rating, rejection_reason, comments, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        feedback_id, 
        action_card.job_id, 
        action_card.candidate_id, 
        5 if decision in ('Approved', 'Edited') else (1 if decision == 'Rejected' else 3),
        notes if decision == 'Rejected' else None,
        notes or (f"Edited outreach draft: {edits[:50]}..." if edits else "No comments"),
        timestamp
    ))
    
    conn.commit()
    conn.close()

    # 2. Construct text log to embed in Vector/Long-Term Memory
    # This text will be semantically searched in future runs for this client/role type.
    memory_text = (
        f"Recruiter action: {decision}. Client: {action_card.evidence_chain.get('client_name', 'Unknown')}. "
        f"Role: {action_card.evidence_chain.get('role_name', 'Unknown')}. Candidate: {action_card.candidate_name}. "
        f"Match Score: {action_card.match_score}%. Feedback notes: {notes}. "
        f"Outreach Edited: {'Yes' if edits else 'No'}."
    )
    
    metadata = {
        "type": "recruiter_preference",
        "client_id": action_card.evidence_chain.get("client_id", "Unknown"),
        "role_name": action_card.evidence_chain.get("role_name", "Unknown"),
        "decision": decision,
        "candidate_id": action_card.candidate_id,
        "timestamp": timestamp
    }
    
    memory_id = f"MEM-{str(uuid.uuid4())[:8]}"
    success = long_term_memory.upsert(
        doc_id=memory_id,
        text=memory_text,
        metadata=metadata
    )
    
    if success:
        logger.info(f"Successfully wrote back recruiter decision {decision} to Long Term Memory.")
    else:
        logger.error(f"Failed to write back recruiter decision {decision} to Long Term Memory.")

    return success
