from pydantic import BaseModel, Field
from typing import List, Dict, Any

class ActionCard(BaseModel):
    id: str = Field(..., description="Action Card unique ID")
    job_id: str = Field(..., description="Related Job Order ID")
    candidate_id: str = Field(..., description="Related Candidate ID")
    candidate_name: str = Field(..., description="Name of candidate")
    match_score: float = Field(..., description="Total weighted fit percentage (0-100)")
    fit_breakdown: Dict[str, float] = Field(..., description="Detailed breakdown scores (skills, salary, stability, etc.)")
    reasons: List[str] = Field(default_factory=list, description="Top 3 reasons to hire/submit candidate")
    risks: List[str] = Field(default_factory=list, description="Key risks identified")
    outreach_draft: str = Field(..., description="AI generated outreach message")
    confidence_score: float = Field(..., description="Model confidence score (0-100)")
    evidence_chain: Dict[str, Any] = Field(default_factory=dict, description="Detailed trace logs from agents for explainability")
    status: str = Field(default="Pending", description="HitL status: Pending, Approved, Edited, Skipped")
