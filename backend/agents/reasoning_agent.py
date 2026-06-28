import logging
import json
import uuid
from google import generativeai as genai
from backend.models.agent_state import AgentState
from backend.config.business_rules import SCORING_WEIGHTS, RED_FLAG_JOB_CHANGES_COUNT
from backend.tools.calendar_check import check_availability_fit
from backend.tools.salary_benchmark import get_salary_benchmark
from backend.config import settings

logger = logging.getLogger("reasoning_agent")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def calculate_skills_score(cand_skills, req_skills, nice_skills) -> float:
    if not req_skills:
        return 100.0
    
    req_set = set(s.lower() for s in req_skills)
    cand_set = set(s.lower() for s in cand_skills)
    
    # Must-have skills overlap
    matched_req = req_set.intersection(cand_set)
    req_score = (len(matched_req) / len(req_set)) * 100.0
    
    # Nice-to-haves addition
    if nice_skills:
        nice_set = set(s.lower() for s in nice_skills)
        matched_nice = nice_set.intersection(cand_set)
        nice_bonus = (len(matched_nice) / len(nice_set)) * 10.0  # up to 10 bonus points
        req_score = min(100.0, req_score + nice_bonus)
        
    return req_score

def calculate_stability_score(job_history) -> float:
    # If no job history, return default full score
    if not job_history:
        return 100.0
    
    # Check for short stays (under 12 months)
    short_stays = 0
    total_jobs = len(job_history)
    
    for job in job_history:
        if hasattr(job, "duration_months"):
            duration = job.duration_months
        elif isinstance(job, dict):
            duration = job.get("duration_months", 24)
        else:
            duration = 24
            
        if duration < 12:
            short_stays += 1
            
    # Calculate stability score
    score = 100.0 - (short_stays * 25.0)
    return max(0.0, score)

def run_reasoning_agent(state: AgentState) -> AgentState:
    """Reasoning Agent node: Analyzes fit metrics, scores profiles, and flags compliance risks."""
    logger.info("Running Reasoning Agent...")
    state["current_step"] = "Reasoning"
    state["logs"].append("Reasoning Agent: Scoring candidates against 4 core business metrics: Skill match depth, Salary fit, Timeline availability, and Job retention stability.")

    job_order = state.get("job_order")
    candidates = state.get("candidates", [])

    if not job_order:
        state["errors"].append("Reasoning Agent: Job order missing in state.")
        return state

    try:
        evaluated_list = []
        
        # Pull historical memory references from state logs to guide LLM reasoning
        past_rejection_clues = [log for log in state["logs"] if "[Rejected]" in log or "Recruiter action: Rejected" in log]
        past_rejections_str = "\n".join(past_rejection_clues)

        for cand in candidates:
            # 1. Math/Deterministic evaluations
            skill_score = calculate_skills_score(cand.skills, job_order.required_skills, job_order.nice_to_have_skills)
            
            # Salary evaluation
            salary_score = 100.0
            if cand.expected_salary > job_order.budget_max:
                diff_pct = (cand.expected_salary - job_order.budget_max) / job_order.budget_max
                salary_score = max(0.0, 100.0 - (diff_pct * 200.0)) # penalize heavily if way over budget
                
            # Availability evaluation
            avail_fit = check_availability_fit(cand.availability_date, job_order.timeline)
            avail_score = avail_fit["score"]
            
            # Stability evaluation
            stability_score = calculate_stability_score(cand.job_history)

            # Combined weighted score
            weighted_score = (
                (skill_score * SCORING_WEIGHTS["skill_match"]) +
                (salary_score * SCORING_WEIGHTS["salary_fit"]) +
                (avail_score * SCORING_WEIGHTS["availability_fit"]) +
                (stability_score * SCORING_WEIGHTS["stability_score"])
            )
            
            # 2. Qualitative analysis using Gemini
            analysis_reasons = []
            analysis_risks = []
            
            # Formulate prompt for Gemini to give deep explanation chain
            if settings.GEMINI_API_KEY:
                prompt = f"""
                You are a senior recruiter analyzing a candidate fit for a client job order.
                
                Client Requirements:
                - Client: {job_order.client_name}
                - Role: {job_order.role_name}
                - Required Skills: {', '.join(job_order.required_skills)}
                - Nice to Have: {', '.join(job_order.nice_to_have_skills)}
                - Location: {job_order.location}
                - Budget Max: {job_order.budget_max}
                
                Candidate Profile:
                - Name: {cand.name}
                - Skills: {', '.join(cand.skills)}
                - Expected Salary: {cand.expected_salary}
                - Experience: {cand.experience_years} years
                - Resume Summary: {cand.resume_summary}
                - Job History: {json.dumps([item.dict() if hasattr(item, "dict") else item for item in cand.job_history])}
                
                Past Client Feedback Cues from memory layer:
                {past_rejections_str}
                
                Task:
                Identify:
                1. Top 3 reasons to submit this candidate.
                2. Top 1 or 2 risk flags (e.g. salary expectations, short job stays, lack of specific framework, availability gap).
                3. A professional assessment/justification.
                
                Provide response in strict JSON format:
                {{
                    "reasons": ["reason 1", "reason 2", "reason 3"],
                    "risks": ["risk 1", "risk 2"],
                    "assessment": "Brief analytical summary"
                }}
                """
                try:
                    model = genai.GenerativeModel("gemini-2.5-flash")
                    response = model.generate_content(prompt)
                    text = response.text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    elif text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    llm_res = json.loads(text.strip())
                    analysis_reasons = llm_res.get("reasons", [])
                    analysis_risks = llm_res.get("risks", [])
                    assessment = llm_res.get("assessment", "Analytical assessment computed.")
                except Exception as e:
                    logger.error(f"Gemini evaluation failed for {cand.name}: {e}")
                    analysis_reasons = [
                        f"Matches {len(set(cand.skills).intersection(set(job_order.required_skills)))} core skills",
                        f"Strong experience profile with {cand.experience_years} years in the field",
                        "Availability timeline is aligned"
                    ]
                    analysis_risks = []
                    if stability_score < 70.0:
                        analysis_risks.append("Short job durations flagged in recent history.")
                    if cand.expected_salary > job_order.budget_max:
                        analysis_risks.append(f"Expected salary of {cand.expected_salary} is above client limit of {job_order.budget_max}.")
                    assessment = f"Profile shows {skill_score}% skill alignment with standard budget clearance (API Fallback)."
            else:
                # Mock qualitative output if no key
                analysis_reasons = [
                    f"Matches {len(set(cand.skills).intersection(set(job_order.required_skills)))} core skills",
                    f"Strong experience profile with {cand.experience_years} years in the field",
                    "Availability timeline is aligned"
                ]
                analysis_risks = []
                if stability_score < 70.0:
                    analysis_risks.append("Short job durations flagged in recent history.")
                if cand.expected_salary > job_order.budget_max:
                    analysis_risks.append(f"Expected salary of {cand.expected_salary} is above client limit of {job_order.budget_max}.")
                assessment = f"Profile shows {skill_score}% skill alignment with standard budget clearance."

            # Construct action card metadata / fit breakdown
            fit_breakdown = {
                "skills": round(skill_score, 1),
                "salary": round(salary_score, 1),
                "availability": round(avail_score, 1),
                "stability": round(stability_score, 1)
            }
            
            # Prepare evidence chain for explanation display on UI
            evidence_chain = {
                "client_id": job_order.client_id,
                "client_name": job_order.client_name,
                "role_name": job_order.role_name,
                "assessment": assessment,
                "benchmarks": get_salary_benchmark(job_order.role_name, job_order.location)
            }

            from backend.models.action_card import ActionCard
            evaluated_card = ActionCard(
                id=f"CARD-{str(uuid.uuid4())[:8].upper()}",
                job_id=job_order.id,
                candidate_id=cand.id,
                candidate_name=cand.name,
                match_score=round(weighted_score, 1),
                fit_breakdown=fit_breakdown,
                reasons=analysis_reasons[:3],
                risks=analysis_risks,
                outreach_draft="", # Generated by recommendation agent next
                confidence_score=round(weighted_score * 0.95, 1),
                evidence_chain=evidence_chain
            )
            evaluated_list.append(evaluated_card)

        state["evaluated_matches"] = evaluated_list
        state["logs"].append(f"Reasoning Agent: Fit evaluations finalized for {len(evaluated_list)} candidates. Flagged compensation mismatches and attrition risks for human review.")

    except Exception as e:
        logger.error(f"Error in Reasoning Agent: {e}")
        state["errors"].append(f"Reasoning Agent failed: {str(e)}")

    return state
