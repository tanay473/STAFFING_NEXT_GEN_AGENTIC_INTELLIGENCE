import logging
import datetime
import sqlite3
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.memory.short_term import session_memory
from backend.models.feedback import Feedback
from backend.config.settings import SQLITE_DB_PATH
from backend.memory.write_back import write_back_decision
from backend.models.action_card import ActionCard

logger = logging.getLogger("client_routes")
router = APIRouter(prefix="/client", tags=["Client Portal"])

class ClientFeedbackRequest(BaseModel):
    job_id: str
    candidate_id: str
    rating: int  # 1-5
    rejection_reason: Optional[str] = None  # overqualified, salary, etc.
    comments: str

@router.get("/status", response_model=Dict[str, Any])
async def get_client_pipeline_status():
    """Returns active job pipelines, candidates submitted, and SLA clocks."""
    job_order = session_memory.get("active_job_order")
    cards = session_memory.get("current_shortlist") or []
    
    # Filter candidates approved/edited/acted on to show client pipeline tracking
    submitted_candidates = []
    for c in cards:
        card_obj = ActionCard(**c)
        if card_obj.status in ('Approved', 'Edited', 'Client_Approved', 'Client_Rejected'):
            # Map database status to client stage status
            if card_obj.status == "Client_Approved":
                client_status = "Interview Scheduled"
            elif card_obj.status == "Client_Rejected":
                client_status = "Rejected"
            else:
                client_status = "Under Review"

            # Convert to client-friendly pipeline card
            submitted_candidates.append({
                "candidate_id": card_obj.candidate_id,
                "name": card_obj.candidate_name,
                "match_score": card_obj.match_score,
                "role_name": job_order.get("role_name", "Open Role") if job_order else "Open Role",
                "job_id": card_obj.job_id,
                "reasons": card_obj.reasons,
                "risks": card_obj.risks,
                "status": client_status,
                "evidence_chain": card_obj.evidence_chain
            })
            
    # Calculate SLA countdown remaining hours
    sla_hours_left = 72.0
    if job_order:
        try:
            deadline = datetime.datetime.fromisoformat(job_order["sla_deadline"])
            now = datetime.datetime.utcnow()
            diff = deadline - now
            sla_hours_left = max(0.0, round(diff.total_seconds() / 3600.0, 1))
        except Exception:
            pass

    return {
        "job_order": job_order,
        "pipeline": submitted_candidates,
        "sla_hours_remaining": sla_hours_left
    }

@router.post("/feedback")
async def submit_client_feedback(req: ClientFeedbackRequest, background_tasks: BackgroundTasks):
    """Saves structured client feedback (e.g. candidate rejection or approval comments) to DB and vector memory."""
    timestamp = datetime.datetime.utcnow().isoformat()
    
    # Save feedback record to CRM SQL table
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    import uuid
    feedback_id = f"CFE-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
        INSERT INTO feedback (id, job_id, candidate_id, rating, rejection_reason, comments, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (feedback_id, req.job_id, req.candidate_id, req.rating, req.rejection_reason, req.comments, timestamp))
    
    conn.commit()
    conn.close()

    # Update candidate status in short-term session memory
    cards = session_memory.get("current_shortlist") or []
    updated_cards = []
    for c in cards:
        card_obj = ActionCard(**c)
        if card_obj.candidate_id == req.candidate_id and card_obj.job_id == req.job_id:
            # Set status based on rating
            card_obj.status = "Client_Approved" if req.rating >= 4 else "Client_Rejected"
            updated_cards.append(card_obj.dict())
        else:
            updated_cards.append(c)
    session_memory.set("current_shortlist", updated_cards)

    # Broadcast event via WebSocket to update client and recruiter portals immediately
    from backend.api.websocket import ws_manager
    client_update = {
        "event": "client_feedback_submitted",
        "job_id": req.job_id,
        "candidate_id": req.candidate_id,
        "rating": req.rating,
        "rejection_reason": req.rejection_reason,
        "comments": req.comments,
        "status": "Client_Approved" if req.rating >= 4 else "Client_Rejected"
    }
    background_tasks.add_task(ws_manager.broadcast, client_update)

    # Index this feedback log in LongTermMemory to avoid repeating matching mistakes
    memory_text = (
        f"Client Feedback on Job {req.job_id}, Candidate {req.candidate_id}. "
        f"Rating: {req.rating}/5. Reason: {req.rejection_reason or 'Accepted'}. Comments: {req.comments}"
    )
    
    metadata = {
        "type": "client_feedback",
        "job_id": req.job_id,
        "candidate_id": req.candidate_id,
        "rating": req.rating,
        "rejection_reason": req.rejection_reason,
        "timestamp": timestamp
    }
    
    from backend.memory.long_term import long_term_memory
    background_tasks.add_task(
        long_term_memory.upsert,
        doc_id=feedback_id,
        text=memory_text,
        metadata=metadata
    )

    return {"status": "success", "feedback_id": feedback_id}
