import logging
from google import generativeai as genai
from backend.models.agent_state import AgentState
from backend.config.business_rules import DEFAULT_OUTREACH_PLAYBOOKS
from backend.config import settings

logger = logging.getLogger("recommendation_agent")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def run_recommendation_agent(state: AgentState) -> AgentState:
    """Recommendation Agent node: Selects top 3 candidates and generates personalized outreach drafts."""
    logger.info("Running Recommendation Agent...")
    state["current_step"] = "Recommendation"
    state["logs"].append("Recommendation Agent: Constructing candidate shortlist optimized for placement success probability and margin requirements.")

    evaluated = state.get("evaluated_matches", [])
    job_order = state.get("job_order")

    if not evaluated:
        state["logs"].append("Recommendation Agent: Sourcing yielded 0 qualifying matches for active Job Order.")
        return state

    try:
        # Sort candidates by match score descending
        evaluated.sort(key=lambda x: x.match_score, reverse=True)
        
        # Select top 3 candidates
        top_3 = evaluated[:3]
        
        for card in top_3:
            candidate_name = card.candidate_name
            role_name = job_order.role_name if job_order else "Software Engineer"
            client_name = job_order.client_name if job_order else "Client Partner"
            
            # Retrieve candidate details to customize draft
            candidate_skills = ", ".join(card.evidence_chain.get("candidate_skills", ["development"]))
            top_skill = card.reasons[0] if card.reasons else "frontend development"
            salary_range = f"${job_order.budget_max}/yr" if job_order else "$120k/yr"
            location = job_order.location if job_order else "Remote"
            
            # Generate outreach draft using Gemini if key is provided
            if settings.GEMINI_API_KEY:
                prompt = f"""
                You are a senior recruiter drafting a highly personalized, warm outreach message.
                
                Candidate Name: {candidate_name}
                Position: {role_name}
                Client Name: {client_name}
                Location: {location}
                Salary Cap: {salary_range}
                Key reasons to contact them (use these to personalize):
                - {', '.join(card.reasons)}
                
                Write a 3-4 sentence message inviting them to schedule a call. Keep it professional, friendly, and direct. Avoid generic boilerplate templates.
                """
                try:
                    model = genai.GenerativeModel("gemini-2.5-flash-lite")
                    response = model.generate_content(prompt)
                    card.outreach_draft = response.text.strip()
                except Exception as e:
                    logger.error(f"Gemini outreach generation failed for {candidate_name}: {e}")
                    # Fallback to standard template
                    card.outreach_draft = DEFAULT_OUTREACH_PLAYBOOKS["standard"].format(
                        candidate_name=candidate_name,
                        role_name=role_name,
                        client_name=client_name,
                        location=location,
                        salary_range=salary_range,
                        duration_type="Full-time"
                    )
            else:
                # Use rule-based templates
                template_type = "senior" if card.match_score > 85.0 else "standard"
                card.outreach_draft = DEFAULT_OUTREACH_PLAYBOOKS[template_type].format(
                    candidate_name=candidate_name,
                    role_name=role_name,
                    client_name=client_name,
                    location=location,
                    salary_range=salary_range,
                    top_skill=top_skill,
                    duration_type="Full-time"
                )

        state["evaluated_matches"] = top_3
        state["logs"].append(f"Recommendation Agent: Shortlist finalized for {len(top_3)} candidates. Generated recruitment playbooks and outreach drafts to accelerate candidates response rates under 72h SLA.")

    except Exception as e:
        logger.error(f"Error in Recommendation Agent: {e}")
        state["errors"].append(f"Recommendation Agent failed: {str(e)}")

    return state
