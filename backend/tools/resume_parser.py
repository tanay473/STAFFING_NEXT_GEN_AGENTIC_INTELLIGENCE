import json
import logging
from google import generativeai as genai
from backend.config import settings

logger = logging.getLogger("resume_parser")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts raw text from a PDF resume using PyMuPDF (fitz) if installed, else fallback."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except ImportError:
        logger.warning("PyMuPDF (fitz) is not installed. Falling back to mock text extractor.")
        # Simulating extraction for testing if path contains specific string
        return f"Mock resume content of candidate from PDF file: {pdf_path}"
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        return f"Error reading resume at path: {pdf_path}"

def parse_resume_text(resume_text: str) -> dict:
    """Uses Gemini to parse resume text into a structured schema matching the Candidate model."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not found. Returning structured mock candidate.")
        return {
            "name": "Sarah Jenkins",
            "email": "sarah.jenkins@email.com",
            "phone": "555-0101",
            "skills": ["React", "TypeScript", "Node.js"],
            "experience_years": 6,
            "expected_salary": 125000,
            "availability_date": "2026-07-15",
            "job_history": [
                {"company": "Apex Fintech", "role": "Senior Frontend Engineer", "duration_months": 36, "reason_for_leaving": "Career advancement"},
                {"company": "PayWise", "role": "Software Engineer", "duration_months": 24, "reason_for_leaving": "Company downsized"}
            ],
            "resume_summary": "Experienced frontend engineer with a background in secure banking UIs and state management."
        }

    prompt = f"""
    You are an expert recruiter assistant.
    Parse the following unstructured resume text into a structured JSON object containing:
    - name: Full name (string)
    - email: Email address (string)
    - phone: Phone number (string)
    - skills: List of specific technical skills, programming languages, libraries, databases (array of strings)
    - experience_years: Total years of experience as an integer (integer)
    - expected_salary: Desired salary or hourly rate (float, default to 110000 if not mentioned)
    - availability_date: Availability start date or period if mentioned, default to 'Immediate' (string)
    - job_history: Array of jobs, each with:
        - company: Company name (string)
        - role: Job title (string)
        - duration_months: Length of time at job in months (integer)
        - reason_for_leaving: Reason if mentioned, or null (string or null)
    - resume_summary: A 1-2 sentence professional summary of the candidate's career highlights.

    Resume Text:
    {resume_text}
    """

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini resume parsing failed: {e}")
        # Return basic structural fallback
        return {
            "name": "Unknown Candidate",
            "email": "unknown@email.com",
            "phone": "N/A",
            "skills": [],
            "experience_years": 0,
            "expected_salary": 0.0,
            "availability_date": "Immediate",
            "job_history": [],
            "resume_summary": "Raw parsing failed. See text logs."
        }
