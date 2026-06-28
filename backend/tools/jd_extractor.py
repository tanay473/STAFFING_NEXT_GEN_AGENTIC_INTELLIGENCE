import json
import logging
from google import generativeai as genai
from backend.config import settings

logger = logging.getLogger("jd_extractor")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def extract_jd_requirements(jd_text: str) -> dict:
    """Uses Gemini to parse unstructured JD requirements/email into structured JSON."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not found. Returning structured mock JD.")
        return {
            "client_name": "Vertex Finance",
            "role_name": "Senior React Developer",
            "required_skills": ["React", "TypeScript", "Redux"],
            "nice_to_have_skills": ["Node.js", "GraphQL"],
            "budget_max": 130000.0,
            "location": "Remote",
            "duration_type": "Full-time",
            "timeline": "3 weeks"
        }

    prompt = f"""
    You are an expert recruiter assistant.
    Parse the following unstructured job order description or client email into a structured JSON object containing:
    - client_name: Stated company name, default to 'Unknown Client' if not mentioned (string)
    - role_name: Exact job title or position name (string)
    - required_skills: List of critical must-have skills, languages, or tools (array of strings)
    - nice_to_have_skills: List of preferred, secondary, or optional skills (array of strings)
    - budget_max: Maximum compensation limit or salary limit (float, default to 120000 if not clear)
    - location: Where they must work (e.g. Remote, Hybrid, Onsite, Hybrid NYC) (string)
    - duration_type: Full-time, Contract, or Temporary (string)
    - timeline: Timeline or start target (e.g. '3 weeks', 'immediate', 'Q3') (string)

    Job Requirement Text:
    {jd_text}
    """

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Gemini JD extraction failed: {e}")
        
        # Heuristic fallback matching common roles/budgets in the JD
        role = "Software Engineer"
        jd_lower = jd_text.lower()
        if "react developer" in jd_lower or "react engineer" in jd_lower:
            role = "Senior React Developer" if "senior" in jd_lower else "React Developer"
        elif "backend" in jd_lower:
            role = "Backend Engineer"
            
        budget = 100000.0
        import re
        # Try to find a number following budget or similar keywords
        budget_match = re.search(r'(?:budget|salary|pay|compensation)\D*(\d+[\d,.]*)', jd_lower)
        if budget_match:
            try:
                budget = float(budget_match.group(1).replace(",", ""))
            except ValueError:
                pass
                
        return {
            "client_name": "Unknown Client",
            "role_name": role,
            "required_skills": ["React", "TypeScript", "Redux"] if "react" in jd_lower else [],
            "nice_to_have_skills": [],
            "budget_max": budget,
            "location": "Remote",
            "duration_type": "Full-time",
            "timeline": "Immediate"
        }
