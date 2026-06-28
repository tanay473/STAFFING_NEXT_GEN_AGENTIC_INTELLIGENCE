import logging
import shutil
import uuid
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.tools.resume_parser import extract_text_from_pdf, parse_resume_text
from backend.config import settings

logger = logging.getLogger("ingest_routes")
router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

@router.post("/upload/resume")
async def upload_candidate_resume(file: UploadFile = File(...)):
    """Receives resume PDF file, extracts and parses skills/history using PyMuPDF + Gemini."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")

    temp_path = os.path.join(settings.DATA_DIR, f"temp_{uuid.uuid4()}_{file.filename}")
    
    try:
        # Save temp file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Parse text from PDF
        raw_text = extract_text_from_pdf(temp_path)
        
        # 2. Extract structured profile fields via LLM
        parsed_profile = parse_resume_text(raw_text)
        
        return {
            "status": "success",
            "filename": file.filename,
            "parsed_profile": parsed_profile
        }
        
    except Exception as e:
        logger.error(f"Error processing resume upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/upload/jd")
async def upload_job_description(file: UploadFile = File(...)):
    """Receives JD PDF file, extracts text and runs the matching planner graph."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF job descriptions are supported.")

    temp_path = os.path.join(settings.DATA_DIR, f"temp_{uuid.uuid4()}_{file.filename}")
    
    try:
        # Save temp file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Extract text from PDF
        raw_text = extract_text_from_pdf(temp_path)
        
        # 2. Forward raw text to planner digest
        from backend.api.recruiter_routes import trigger_new_jd_planner, IngestJobRequest
        return await trigger_new_jd_planner(IngestJobRequest(jd_text=raw_text))
        
    except Exception as e:
        logger.error(f"Error processing JD PDF upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/webhook/email")
async def email_webhook_simulation(payload: dict):
    """Simulates an email webhook firing when a client sends a recruiting request."""
    email_body = payload.get("body", "")
    if not email_body:
        raise HTTPException(status_code=400, detail="Empty email body.")
        
    logger.info("Email webhook trigger fired. Forwarding to recruiter digest agent...")
    from backend.api.recruiter_routes import trigger_new_jd_planner, IngestJobRequest
    return await trigger_new_jd_planner(IngestJobRequest(jd_text=email_body))
