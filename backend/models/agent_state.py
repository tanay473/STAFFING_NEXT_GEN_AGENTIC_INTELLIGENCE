from typing import TypedDict, List, Optional, Any
from backend.models.job_order import JobOrder
from backend.models.candidate import Candidate
from backend.models.action_card import ActionCard

class AgentState(TypedDict):
    job_id: str
    job_order: Optional[JobOrder]
    raw_input_jd: Optional[str]
    raw_input_resumes: Optional[List[str]]  # File paths or text
    candidates: List[Candidate]
    evaluated_matches: List[ActionCard]
    logs: List[str]
    errors: List[str]
    current_step: str
    client_name_override: Optional[str]
    role_name_override: Optional[str]
    budget_max_override: Optional[float]
    location_override: Optional[str]
    required_skills_override: Optional[List[str]]
    nice_to_have_skills_override: Optional[List[str]]
    memories: Optional[List[Any]]


