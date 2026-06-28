from pydantic import BaseModel, Field
from typing import List, Optional

class JobHistoryItem(BaseModel):
    company: str
    role: str
    duration_months: int
    reason_for_leaving: Optional[str] = None

class Candidate(BaseModel):
    id: str = Field(..., description="Unique candidate ID")
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")
    phone: str = Field(..., description="Phone number")
    skills: List[str] = Field(default_factory=list, description="Extracted skills list")
    experience_years: int = Field(..., description="Years of relevant experience")
    expected_salary: float = Field(..., description="Expected salary or hourly rate")
    availability_date: str = Field(..., description="Availability start date (YYYY-MM-DD or standard status)")
    job_history: List[JobHistoryItem] = Field(default_factory=list, description="Historical work experience")
    resume_summary: str = Field(..., description="Short bio or resume summary")
    stability_score: float = Field(default=100.0, description="Calculated stability rating (0-100)")
    status: str = Field(default="Active", description="Pipeline status: Active, Placed, Sourced")
