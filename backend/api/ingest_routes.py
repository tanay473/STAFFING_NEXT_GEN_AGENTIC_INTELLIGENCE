import logging
import shutil
import uuid
import os
import sqlite3
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.tools.resume_parser import extract_text_from_pdf, parse_resume_text
from backend.config import settings

logger = logging.getLogger("ingest_routes")
router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

@router.post("/upload/resume")
async def upload_candidate_resume(file: UploadFile = File(...)):
    """Receives resume PDF file, extracts and parses skills/history using PyMuPDF + Gemini, and saves to database."""
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
        
        # 3. Calculate stability score based on job history tenure
        job_history_list = parsed_profile.get("job_history", [])
        if job_history_list:
            durations = [j.get("duration_months", 12) or 12 for j in job_history_list]
            avg_tenure = sum(durations) / len(durations)
            stability_score = min(100.0, max(10.0, avg_tenure * 2.7))
        else:
            stability_score = 80.0
        stability_score = round(stability_score, 1)

        candidate_id = f"CAND-{str(uuid.uuid4())[:8].upper()}"
        name = parsed_profile.get("name") or "Unknown Candidate"
        email = parsed_profile.get("email") or "unknown@email.com"
        phone = parsed_profile.get("phone") or "555-0000"
        skills = json.dumps(parsed_profile.get("skills") or [])
        experience_years = parsed_profile.get("experience_years") or 0
        expected_salary = parsed_profile.get("expected_salary") or 110000.0
        availability_date = parsed_profile.get("availability_date") or "Immediate"
        job_history = json.dumps(job_history_list)
        resume_summary = parsed_profile.get("resume_summary") or ""
        status = "Active"

        # 4. Save to SQL Database (Insert or Update if email exists)
        conn = sqlite3.connect(settings.SQLITE_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM candidates WHERE email = ?", (email,))
        existing = cursor.fetchone()
        if existing:
            candidate_id = existing[0]
            cursor.execute("""
                UPDATE candidates
                SET name=?, phone=?, skills=?, experience_years=?, expected_salary=?, availability_date=?, job_history=?, resume_summary=?, stability_score=?, status=?
                WHERE id=?
            """, (name, phone, skills, experience_years, expected_salary, availability_date, job_history, resume_summary, stability_score, status, candidate_id))
        else:
            cursor.execute("""
                INSERT INTO candidates (id, name, email, phone, skills, experience_years, expected_salary, availability_date, job_history, resume_summary, stability_score, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (candidate_id, name, email, phone, skills, experience_years, expected_salary, availability_date, job_history, resume_summary, stability_score, status))
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "filename": file.filename,
            "candidate_id": candidate_id,
            "parsed_profile": {
                **parsed_profile,
                "stability_score": stability_score,
                "id": candidate_id
            }
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

@router.post("/parse-jd-file")
async def parse_jd_file(file: UploadFile = File(...)):
    """Receives JD PDF file, extracts text, runs the structured extraction, and returns it."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF job descriptions are supported.")

    temp_path = os.path.join(settings.DATA_DIR, f"temp_{uuid.uuid4()}_{file.filename}")
    
    try:
        # Save temp file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Extract text from PDF
        raw_text = extract_text_from_pdf(temp_path)
        
        # 2. Extract structured details using Gemini
        from backend.tools.jd_extractor import extract_jd_requirements
        details = extract_jd_requirements(raw_text)
        
        return {
            "status": "success",
            "jd_text": raw_text,
            "details": details
        }
        
    except Exception as e:
        logger.error(f"Error parsing JD PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

