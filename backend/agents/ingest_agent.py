import logging
import uuid
import datetime
from backend.models.agent_state import AgentState
from backend.tools.jd_extractor import extract_jd_requirements
from backend.models.job_order import JobOrder

logger = logging.getLogger("ingest_agent")

def run_ingest_agent(state: AgentState) -> AgentState:
    """Ingest agent node: Parses JDs or resume paths and structures them."""
    logger.info("Running Ingest Agent...")
    state["current_step"] = "Ingest"
    state["logs"].append("Ingest Agent: Initiated job intake parsing to extract candidate budget caps, required skills, and target deadlines.")

    try:
        if state.get("raw_input_jd"):
            raw_text = state["raw_input_jd"]
            # Extract structured JSON requirements from raw email/text
            parsed_data = extract_jd_requirements(raw_text)
            
            # Formulate the JobOrder model
            job_id = state.get("job_id") or f"JOB-{str(uuid.uuid4())[:8].upper()}"
            state["job_id"] = job_id
            
            created_at = datetime.datetime.utcnow().isoformat()
            sla_deadline = (datetime.datetime.utcnow() + datetime.timedelta(days=3)).isoformat() # SLA default 72h
            
            client_name = parsed_data.get("client_name")
            if not client_name or client_name.strip() in ("", "Unknown Client"):
                import random
                sleek_companies = [
                    "Aether Solutions", "Apex Global", "Zenith Technologies", 
                    "Vortex Finance", "Quantum Leap Partners", "Prism Digital", 
                    "Helix Systems", "Nexa Corp", "Stratis AI", "Velocity Ventures"
                ]
                client_name = random.choice(sleek_companies)
            else:
                client_name = client_name.strip()
            
            job_order = JobOrder(
                id=job_id,
                client_id=parsed_data.get("client_id") or "CLI-001",
                client_name=client_name,
                role_name=parsed_data.get("role_name") or "Software Engineer",
                required_skills=parsed_data.get("required_skills") or [],
                nice_to_have_skills=parsed_data.get("nice_to_have_skills") or [],
                budget_max=parsed_data.get("budget_max") or 120000.0,
                location=parsed_data.get("location") or "Remote",
                duration_type=parsed_data.get("duration_type") or "Full-time",
                timeline=parsed_data.get("timeline") or "3 weeks",
                created_at=created_at,
                sla_deadline=sla_deadline
            )
            
            state["job_order"] = job_order
            state["logs"].append(f"Ingest Agent: Job Order targets established. Client: '{job_order.client_name}', Position: '{job_order.role_name}', Salary Ceiling: ${job_order.budget_max}. Active 72-hour SLA tracker initiated.")
        else:
            state["errors"].append("Ingest Agent: No raw JD text provided.")
            
    except Exception as e:
        logger.error(f"Error in Ingest Agent: {e}")
        state["errors"].append(f"Ingest Agent failed: {str(e)}")

    return state
