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

def parse_resume_fallback_regex(resume_text: str) -> dict:
    """Fallback parser using regex to extract candidate details when Gemini is rate-limited or disabled."""
    import re
    
    # 1. Extract Email
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
    email = email_match.group(0) if email_match else "unknown@email.com"
    
    # 2. Extract Phone
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    phone = phone_match.group(0) if phone_match else "N/A"
    
    # 3. Extract Name (Typically the first non-empty line under 40 chars that doesn't contain digits or emails)
    name = "Unknown Candidate"
    lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
    if lines:
        for line in lines[:4]:
            if "@" not in line and not re.search(r'\d{5}', line) and len(line) < 35:
                # Remove common header noise
                clean_line = re.sub(r'(resume|cv|curriculum vitae|contact|profile)', '', line, flags=re.IGNORECASE).strip()
                if clean_line:
                    name = clean_line
                    break
                
    # 4. Search for matching skills
    known_skills = [
        "React", "TypeScript", "JavaScript", "HTML", "CSS", "Node.js", "Express", 
        "Redux", "Vue.js", "Angular", "Python", "Django", "FastAPI", "Flask", 
        "Java", "Spring Boot", "AWS", "Docker", "Kubernetes", "SQL", "PostgreSQL", 
        "MySQL", "MongoDB", "Redis", "Kafka", "Git", "GitHub", "Next.js", "Jest",
        "React Native", "TailwindCSS", "Terraform", "Google Cloud", "Azure", "GraphQL"
    ]
    detected_skills = []
    for skill in known_skills:
        if re.search(rf'\b{re.escape(skill)}\b', resume_text, re.IGNORECASE):
            detected_skills.append(skill)
            
    # 5. Estimate Experience Years
    exp_match = re.search(r'(\d+)\+?\s*years?\s+(?:of\s+)?experience', resume_text, re.IGNORECASE)
    experience_years = int(exp_match.group(1)) if exp_match else 4
    
    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": detected_skills,
        "experience_years": experience_years,
        "expected_salary": 115000.0,
        "availability_date": "Immediate",
        "job_history": [],
        "resume_summary": "Extracted via local pattern matching (LLM Quota Limit Fallback)."
    }

def parse_resume_text(resume_text: str) -> dict:
    """Uses Gemini to parse resume text, falling back to a regex parser if rate-limited."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not found. Running regex fallback parser.")
        return parse_resume_fallback_regex(resume_text)

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
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        try:
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
        except Exception:
            # Fallback if response_mime_type config isn't supported in local SDK version
            response = model.generate_content(prompt)
            
        text = response.text.strip()
        # Strip markdown fences if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Gemini resume parsing failed: {e}. Executing local regex fallback parser...")
        return parse_resume_fallback_regex(resume_text)
