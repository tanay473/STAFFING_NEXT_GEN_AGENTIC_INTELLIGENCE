# Candidate Scoring Weights (must sum to 1.0)
SCORING_WEIGHTS = {
    "skill_match": 0.40,
    "salary_fit": 0.20,
    "availability_fit": 0.20,
    "stability_score": 0.20,
}

# SLA Countdown Configuration
SLA_LIMIT_HOURS = 72  # SLA to recommend and submit candidates to client
ALERT_SILENCE_LIMIT_HOURS = 48  # Highlight candidates/clients with no activity for >48h

# Matching Thresholds
MIN_MATCH_SCORE_TO_RECOMMEND = 65.0  # Pass threshold
RED_FLAG_JOB_CHANGES_COUNT = 3  # Alert if candidate changed >= 3 jobs in 2 years

# Default templates for agent outreach drafts
DEFAULT_OUTREACH_PLAYBOOKS = {
    "standard": "Hi {candidate_name},\n\nI saw your profile and thought you'd be a great fit for the {role_name} position at {client_name}. It's a {duration_type} role offering {salary_range} in {location}. Let me know if you are free for a quick chat!\n\nBest,\nRecruiter Team",
    "senior": "Hello {candidate_name},\n\nI am currently partnering with {client_name} to find a Senior {role_name}. Given your expertise in {top_skill}, I think your background aligns perfectly with their roadmap. They offer a remote workspace and competitive compensation up to {salary_range}. Let's schedule a call this week to discuss.\n\nBest regards,\nLead Consultant",
}
