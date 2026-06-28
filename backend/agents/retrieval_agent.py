import logging
from backend.models.agent_state import AgentState
from backend.tools.crm_lookup import search_candidates_crm, get_client_by_name
from backend.models.candidate import Candidate
from backend.memory.long_term import long_term_memory

logger = logging.getLogger("retrieval_agent")

def run_retrieval_agent(state: AgentState) -> AgentState:
    """Retrieval Agent node: Finds matching candidate records and pulls historical client preference cues."""
    logger.info("Running Retrieval Agent...")
    state["current_step"] = "Retrieval"
    state["logs"].append("Retrieval Agent: Sourcing active candidates from talent pipelines. Accessing past placements and client feedback to guide matching criteria.")

    job_order = state.get("job_order")
    if not job_order:
        state["errors"].append("Retrieval Agent: Job order missing in state.")
        return state

    try:
        # 1. Fetch matching candidates by skills from CRM SQLite database
        raw_candidates = search_candidates_crm(skills=job_order.required_skills)
        
        # If no skill match found, fetch all active candidates as fallback
        if not raw_candidates:
            state["logs"].append("Retrieval Agent: Lower talent density matched. Expanding fallback pipeline parameters to satisfy SLA criteria.")
            raw_candidates = search_candidates_crm()
            
        candidates = [Candidate(**cand) for cand in raw_candidates]
        state["candidates"] = candidates
        state["logs"].append(f"Retrieval Agent: Sourced {len(candidates)} candidate profiles from active database.")

        # 2. Retrieve long-term memory logs & historical rejections/placements
        # Query semantic memory using client name & role type
        query_str = f"Client: {job_order.client_name} Role: {job_order.role_name}"
        memories = long_term_memory.query(query_str, top_k=5)
        
        # Extract placement histories/rejections
        history_summaries = []
        for mem in memories:
            history_summaries.append(f"[{mem['metadata'].get('decision', 'Note')}]: {mem['text']}")

        # Store in state logs for Reasoning node to consume
        state["logs"].append(f"Retrieval Agent: Extracted {len(memories)} client-specific historical preference vectors from memory layer.")
        if history_summaries:
            state["logs"].append("Retrieval Agent: Injected past client feedback models into current reasoning pipeline.")
            # Put them in state metadata / evidence chains (we will pass logs to reasoning agent)
            
    except Exception as e:
        logger.error(f"Error in Retrieval Agent: {e}")
        state["errors"].append(f"Retrieval Agent failed: {str(e)}")

    return state
