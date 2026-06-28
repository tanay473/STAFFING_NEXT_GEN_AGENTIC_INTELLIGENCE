import datetime
import logging
from typing import Dict, Any

logger = logging.getLogger("calendar_check")

def check_availability_fit(candidate_avail_str: str, target_start_str: str) -> Dict[str, Any]:
    """
    Parses dates to calculate date overlap/compliance.
    Returns score (0-100), days_diff, and a status message.
    """
    # Quick parser
    def parse_date(date_str: str) -> datetime.date:
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        # If immediate or can't parse, default to today
        return datetime.date.today()

    try:
        # Check for immediate availability keywords
        if "immediate" in candidate_avail_str.lower() or "active" in candidate_avail_str.lower():
            return {
                "score": 100.0,
                "days_delay": 0,
                "message": "Candidate is immediately available.",
                "risk": None
            }

        avail_date = parse_date(candidate_avail_str)
        
        # Approximate target start date parsing
        # e.g., '3 weeks' -> today + 21 days, else parse direct date
        if "week" in target_start_str.lower():
            try:
                weeks = int(target_start_str.split()[0])
            except Exception:
                weeks = 3
            start_date = datetime.date.today() + datetime.timedelta(weeks=weeks)
        else:
            start_date = parse_date(target_start_str)

        days_delay = (avail_date - start_date).days
        
        if days_delay <= 0:
            return {
                "score": 100.0,
                "days_delay": days_delay,
                "message": f"Candidate available {abs(days_delay)} days before target start date.",
                "risk": None
            }
        elif days_delay <= 14:
            return {
                "score": 80.0,
                "days_delay": days_delay,
                "message": f"Minor delay: candidate available {days_delay} days after target start date.",
                "risk": f"Minor delay of {days_delay} days"
            }
        else:
            return {
                "score": 40.0,
                "days_delay": days_delay,
                "message": f"Major delay: candidate available {days_delay} days after target start.",
                "risk": f"Availability conflict: {days_delay} days delay"
            }
            
    except Exception as e:
        logger.error(f"Error checking calendar: {e}")
        return {
            "score": 100.0,
            "days_delay": 0,
            "message": "Immediate (Calendar check default)",
            "risk": None
        }
