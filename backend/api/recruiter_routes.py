import logging
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import google.generativeai as genai
from backend.config.settings import GEMINI_API_KEY
from backend.models.action_card import ActionCard
from backend.agents.planner import planner_app
from backend.agents.engagement_monitor import check_engagement_alerts
from backend.memory.short_term import session_memory
from backend.memory.write_back import write_back_decision
from backend.api.websocket import ws_manager

logger = logging.getLogger("recruiter_routes")
router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

class IngestJobRequest(BaseModel):
    jd_text: str

class ActionRequest(BaseModel):
    action_card_id: str
    decision: str  # 'Approved', 'Rejected', 'Edited', 'Skipped'
    notes: Optional[str] = ""
    edits: Optional[str] = ""

@router.get("/queue", response_model=Dict[str, Any])
async def get_recruiter_queue():
    """Fetches active recommendation cards and background alerts for the priority queue."""
    # Load candidate cards from short-term memory session
    cards = session_memory.get("current_shortlist") or []
    # Run engagement monitor to get background warnings (ghosting/SLA countdowns)
    alerts = check_engagement_alerts()
    
    return {
        "action_cards": cards,
        "alerts": alerts
    }

@router.post("/action")
async def process_recruiter_action(req: ActionRequest, background_tasks: BackgroundTasks):
    """Processes recruiter decision on a card, triggers long-term write-back and client portal update."""
    cards = session_memory.get("current_shortlist") or []
    matching_card = None
    updated_cards = []
    
    for c in cards:
        card_obj = ActionCard(**c)
        if card_obj.id == req.action_card_id:
            card_obj.status = req.decision
            if req.edits:
                card_obj.outreach_draft = req.edits
            matching_card = card_obj
            updated_cards.append(card_obj.dict())
        else:
            updated_cards.append(c)

    if not matching_card:
        raise HTTPException(status_code=404, detail="Action card not found in active session.")

    # Save updated session list
    session_memory.set("current_shortlist", updated_cards)

    # 1. Close learning cycle asynchronously in background
    background_tasks.add_task(
        write_back_decision, 
        action_card=matching_card, 
        decision=req.decision, 
        notes=req.notes, 
        edits=req.edits
    )

    # 2. Push real-time update to client portal via WebSocket if approved
    if req.decision in ('Approved', 'Edited'):
        client_update = {
            "event": "candidate_submitted",
            "job_id": matching_card.job_id,
            "candidate_id": matching_card.candidate_id,
            "candidate_name": matching_card.candidate_name,
            "match_score": matching_card.match_score,
            "reasons": matching_card.reasons,
            "status": "Submitted",
            "evidence_chain": matching_card.evidence_chain
        }
        background_tasks.add_task(ws_manager.broadcast, client_update)
        
    return {"status": "success", "processed_card_id": req.action_card_id, "action": req.decision}

@router.post("/digest")
async def trigger_new_jd_planner(req: IngestJobRequest):
    """Triggers the LangGraph pipeline for a new Job Description text."""
    logger.info("New JD request received. Invoking LangGraph state machine...")
    
    # Initialize LangGraph shared state
    initial_state = {
        "job_id": f"JOB-{str(uuid.uuid4())[:8].upper()}",
        "job_order": None,
        "raw_input_jd": req.jd_text,
        "raw_input_resumes": None,
        "candidates": [],
        "evaluated_matches": [],
        "logs": [],
        "errors": [],
        "current_step": "Ingest"
    }

    try:
        # Run graph execution
        final_state = planner_app.invoke(initial_state)
        
        if final_state.get("errors"):
            logger.error(f"Planner finished with errors: {final_state['errors']}")
            raise HTTPException(status_code=500, detail=f"Pipeline run encountered errors: {final_state['errors']}")

        # Retrieve action cards matching schemas
        action_cards = final_state.get("evaluated_matches", [])
        cards_dict = [c.dict() for c in action_cards]
        
        # Save recommendations to short-term queue
        session_memory.set("current_shortlist", cards_dict)
        session_memory.set("active_job_order", final_state["job_order"].dict())
        
        # Broadcast real-time event to sync client portal / dependent components
        await ws_manager.broadcast({
            "event": "pipeline_updated",
            "job_id": final_state["job_id"]
        })
        
        return {
            "status": "success",
            "job_id": final_state["job_id"],
            "job_order": final_state["job_order"].dict(),
            "recommendations": cards_dict,
            "logs": final_state["logs"]
        }
        
    except Exception as e:
        logger.error(f"Failed to run planner graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class RejectionDraftRequest(BaseModel):
    candidate_name: str
    role_name: str
    client_name: str
    reason: str
    comments: Optional[str] = ""

@router.post("/draft-rejection")
async def draft_rejection(req: RejectionDraftRequest):
    """Uses Gemini to draft a polite, constructive candidate rejection message."""
    reason_map = {
        "overqualified": "they exceed the required experience/seniority level for this specific role, and we are looking for someone more aligned with the scope of this position.",
        "underqualified": "they are missing some of the required technical framework skills outlined in the job description.",
        "salary_mismatch": "their salary expectations exceed the maximum approved budget for this hiring mandate.",
        "stability": "their recent job stability history shows multiple short-term career changes, and the client prioritizes long-term role stability.",
        "other": "their profile did not fully align with the client's current hiring criteria."
    }
    
    selected_reason = reason_map.get(req.reason, req.reason)
    prompt = f"""
    You are a professional, empathetic recruiter.
    Draft a polite, constructive, and warm candidate rejection email/message.
    
    Candidate Name: {req.candidate_name}
    Role: {req.role_name}
    Client Name: {req.client_name}
    Reason: {selected_reason}
    Extra Comments: {req.comments}
    
    Keep the message to 2-3 sentences. Encourage them, thank them for their time, and express a desire to stay connected for future opportunities. Avoid robotic templates.
    """
    
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            draft = response.text.strip()
        except Exception as e:
            logger.error(f"Gemini rejection draft failed: {e}")
            draft = f"Hi {req.candidate_name}, thank you for your time. Unfortunately, the client has chosen to pass on your profile for the {req.role_name} position due to {selected_reason}. Let's stay in touch."
    else:
        draft = f"Hi {req.candidate_name}, thank you for your time. Unfortunately, the client has chosen to pass on your profile for the {req.role_name} position due to {selected_reason}. Let's stay in touch."
        
    return {"rejection_draft": draft}
