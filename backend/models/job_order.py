from pydantic import BaseModel, Field
from typing import List, Optional

class JobOrder(BaseModel):
    id: str = Field(..., description="Unique job order ID")
    client_id: str = Field(..., description="Client ID from CRM")
    client_name: str = Field(..., description="Client company name")
    role_name: str = Field(..., description="Name of the position")
    required_skills: List[str] = Field(default_factory=list, description="List of must-have skills")
    nice_to_have_skills: List[str] = Field(default_factory=list, description="List of optional skills")
    budget_max: float = Field(..., description="Maximum budget (hourly rate or annual salary)")
    location: str = Field(..., description="Location of work (e.g. Remote, Hybrid, Onsite)")
    duration_type: str = Field(..., description="Employment type (Full-time, Contract, Temp)")
    timeline: str = Field(..., description="Start timeline (e.g. 3 weeks, immediate)")
    created_at: str = Field(..., description="Creation date timestamp")
    sla_deadline: str = Field(..., description="SLA deadline timestamp")
