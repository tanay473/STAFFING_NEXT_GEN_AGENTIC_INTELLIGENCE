import sqlite3
import json
import os
from pathlib import Path

# Fix path resolution
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = str(DATA_DIR / "crm.db")

def seed_database():
    print(f"Connecting to database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop existing tables
    cursor.execute("DROP TABLE IF EXISTS candidates")
    cursor.execute("DROP TABLE IF EXISTS clients")
    cursor.execute("DROP TABLE IF EXISTS placements")
    cursor.execute("DROP TABLE IF EXISTS salary_benchmarks")
    cursor.execute("DROP TABLE IF EXISTS playbooks")
    cursor.execute("DROP TABLE IF EXISTS feedback")

    # Create Candidates Table
    cursor.execute("""
    CREATE TABLE candidates (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        skills TEXT, -- JSON Array
        experience_years INTEGER,
        expected_salary REAL,
        availability_date TEXT,
        job_history TEXT, -- JSON Array
        resume_summary TEXT,
        stability_score REAL,
        status TEXT
    )
    """)

    # Create Clients Table
    cursor.execute("""
    CREATE TABLE clients (
        id TEXT PRIMARY KEY,
        name TEXT,
        industry TEXT,
        preferences TEXT -- JSON Object
    )
    """)

    # Create Placements Table
    cursor.execute("""
    CREATE TABLE placements (
        id TEXT PRIMARY KEY,
        client_id TEXT,
        role_name TEXT,
        candidate_name TEXT,
        billing_rate REAL,
        placement_date TEXT,
        status TEXT
    )
    """)

    # Create Salary Benchmarks Table
    cursor.execute("""
    CREATE TABLE salary_benchmarks (
        role_name TEXT,
        location TEXT,
        min_salary REAL,
        max_salary REAL,
        PRIMARY KEY (role_name, location)
    )
    """)

    # Create Playbooks Table
    cursor.execute("""
    CREATE TABLE playbooks (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT
    )
    """)

    # Create Feedback Table
    cursor.execute("""
    CREATE TABLE feedback (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        candidate_id TEXT,
        rating INTEGER,
        rejection_reason TEXT,
        comments TEXT,
        created_at TEXT
    )
    """)

    # Seed candidates
    candidates = [
        {
            "id": "CAND-001",
            "name": "Sarah Jenkins",
            "email": "sarah.jenkins@email.com",
            "phone": "555-0101",
            "skills": json.dumps(["React", "TypeScript", "Redux", "Node.js", "GraphQL"]),
            "experience_years": 6,
            "expected_salary": 125000.0,
            "availability_date": "2026-07-15",
            "job_history": json.dumps([
                {"company": "Apex Fintech", "role": "Senior Frontend Engineer", "duration_months": 36, "reason_for_leaving": "Career advancement"},
                {"company": "PayWise", "role": "Software Engineer", "duration_months": 24, "reason_for_leaving": "Company downsized"}
            ]),
            "resume_summary": "Experienced frontend engineer with a background in secure banking UIs and state management.",
            "stability_score": 95.0,
            "status": "Active"
        },
        {
            "id": "CAND-002",
            "name": "Alex Mercer",
            "email": "alex.mercer@email.com",
            "phone": "555-0102",
            "skills": json.dumps(["React", "JavaScript", "HTML/CSS", "Next.js"]),
            "experience_years": 5,
            "expected_salary": 145000.0,
            "availability_date": "2026-08-01",
            "job_history": json.dumps([
                {"company": "SaaSify", "role": "UI Engineer", "duration_months": 6, "reason_for_leaving": "Better offer"},
                {"company": "CryptoCloud", "role": "React dev", "duration_months": 8, "reason_for_leaving": "Found new gig"},
                {"company": "ByteScale", "role": "Frontend contractor", "duration_months": 7, "reason_for_leaving": "Contract ended"}
            ]),
            "resume_summary": "Fast-paced React developer skilled in web dashboards and landing pages.",
            "stability_score": 45.0,  # Stability risk: multiple short hops
            "status": "Active"
        },
        {
            "id": "CAND-003",
            "name": "Elena Rostova",
            "email": "elena.r@email.com",
            "phone": "555-0103",
            "skills": json.dumps(["React", "React Native", "TypeScript", "Jest", "CSS"]),
            "experience_years": 8,
            "expected_salary": 115000.0,
            "availability_date": "2026-07-01",
            "job_history": json.dumps([
                {"company": "Global Trade Corp", "role": "Staff Engineer UI", "duration_months": 48, "reason_for_leaving": "Looking for remote roles"},
                {"company": "InnoSoft", "role": "Senior Engineer", "duration_months": 36, "reason_for_leaving": "Relocated"}
            ]),
            "resume_summary": "Staff Engineer UI with extensive expertise in cross-platform React web and mobile applications.",
            "stability_score": 100.0,
            "status": "Active"
        },
        {
            "id": "CAND-004",
            "name": "Marcus Vance",
            "email": "marcus.vance@email.com",
            "phone": "555-0104",
            "skills": json.dumps(["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"]),
            "experience_years": 4,
            "expected_salary": 110000.0,
            "availability_date": "2026-07-20",
            "job_history": json.dumps([
                {"company": "DevSystems", "role": "Backend Engineer", "duration_months": 30, "reason_for_leaving": "Tech stack pivot"},
                {"company": "WebCorp", "role": "Junior Backend Dev", "duration_months": 18, "reason_for_leaving": "Promotion opportunity"}
            ]),
            "resume_summary": "Backend specialist focused on scalable APIs and containerized deployments.",
            "stability_score": 85.0,
            "status": "Active"
        },
        {
            "id": "CAND-005",
            "name": "Devin Cole",
            "email": "devin.cole@email.com",
            "phone": "555-0105",
            "skills": json.dumps(["Python", "FastAPI", "Django", "PostgreSQL", "Redis", "Celery"]),
            "experience_years": 5,
            "expected_salary": 118000.0,
            "availability_date": "2026-07-01",
            "job_history": json.dumps([
                {"company": "Apex SaaS", "role": "Backend Developer", "duration_months": 24, "reason_for_leaving": "Career growth"},
                {"company": "CodeHouse", "role": "Software Developer", "duration_months": 36, "reason_for_leaving": "Relocated"}
            ]),
            "resume_summary": "FastAPI specialist with expertise in background task queues and relational database optimization.",
            "stability_score": 90.0,
            "status": "Active"
        },
        {
            "id": "CAND-006",
            "name": "Fiona Gallagher",
            "email": "fiona.g@email.com",
            "phone": "555-0106",
            "skills": json.dumps(["React", "TypeScript", "Next.js", "TailwindCSS", "Node.js", "Docker"]),
            "experience_years": 4,
            "expected_salary": 105000.0,
            "availability_date": "2026-07-15",
            "job_history": json.dumps([
                {"company": "SouthSide UI", "role": "Frontend developer", "duration_months": 18, "reason_for_leaving": "Contract complete"},
                {"company": "Gallagher Tech", "role": "React contractor", "duration_months": 24, "reason_for_leaving": "Seeking permanent position"}
            ]),
            "resume_summary": "Full stack Javascript developer with a focus on modern user interfaces and SSR deployment pipelines.",
            "stability_score": 80.0,
            "status": "Active"
        },
        {
            "id": "CAND-007",
            "name": "George Miller",
            "email": "george.miller@email.com",
            "phone": "555-0107",
            "skills": json.dumps(["AWS", "Kubernetes", "Docker", "Terraform", "Go", "Python"]),
            "experience_years": 10,
            "expected_salary": 160000.0,
            "availability_date": "2026-08-01",
            "job_history": json.dumps([
                {"company": "CloudSphere", "role": "Principal DevOps Architect", "duration_months": 48, "reason_for_leaving": "Mandate concluded"},
                {"company": "Infrastructure Lab", "role": "Senior Cloud Infrastructure", "duration_months": 60, "reason_for_leaving": "Desired remote shift"}
            ]),
            "resume_summary": "DevOps Architect specializing in Infrastructure as Code (IaC) and container orchestration at enterprise scale.",
            "stability_score": 100.0,
            "status": "Active"
        },
        {
            "id": "CAND-008",
            "name": "Hana Takahashi",
            "email": "hana.t@email.com",
            "phone": "555-0108",
            "skills": json.dumps(["Vue.js", "JavaScript", "HTML/CSS", "Nuxt.js", "Node.js"]),
            "experience_years": 3,
            "expected_salary": 95000.0,
            "availability_date": "2026-07-01",
            "job_history": json.dumps([
                {"company": "Tokyo Web Co", "role": "Junior Frontend developer", "duration_months": 12, "reason_for_leaving": "Company reorganization"},
                {"company": "Osaka Software", "role": "Web Engineer", "duration_months": 24, "reason_for_leaving": "Seeking remote agency contract"}
            ]),
            "resume_summary": "Vue.js enthusiast with a track record of building performant single-page applications and static sites.",
            "stability_score": 75.0,
            "status": "Active"
        },
        {
            "id": "CAND-009",
            "name": "Ivan Petrov",
            "email": "ivan.p@email.com",
            "phone": "555-0109",
            "skills": json.dumps(["Java", "Spring Boot", "Microservices", "Oracle", "Kafka", "Kubernetes"]),
            "experience_years": 7,
            "expected_salary": 130000.0,
            "availability_date": "2026-07-15",
            "job_history": json.dumps([
                {"company": "Siberian Banking Group", "role": "Spring Boot Developer", "duration_months": 36, "reason_for_leaving": "Seeking international projects"},
                {"company": "UralTech", "role": "Java Engineer", "duration_months": 40, "reason_for_leaving": "Company downsized"}
            ]),
            "resume_summary": "Senior Java Developer focusing on Spring Boot microservices, transaction safety, and stream pipelines.",
            "stability_score": 92.0,
            "status": "Active"
        }
    ]

    for c in candidates:
        cursor.execute("""
        INSERT INTO candidates (id, name, email, phone, skills, experience_years, expected_salary, availability_date, job_history, resume_summary, stability_score, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (c["id"], c["name"], c["email"], c["phone"], c["skills"], c["experience_years"], c["expected_salary"], c["availability_date"], c["job_history"], c["resume_summary"], c["stability_score"], c["status"]))

    # Seed clients
    clients = [
        {
            "id": "CLI-001",
            "name": "Vertex Finance",
            "industry": "Fintech",
            "preferences": json.dumps({
                "preferred_stability": "high",  # Prefers stability_score > 80
                "preferred_skills": ["React", "TypeScript"],
                "max_hourly_rate": 85.0
            })
        },
        {
            "id": "CLI-002",
            "name": "RapidApp Solutions",
            "industry": "Software Agency",
            "preferences": json.dumps({
                "preferred_stability": "any",
                "preferred_skills": ["React", "Next.js"],
                "max_hourly_rate": 100.0
            })
        }
    ]

    for cl in clients:
        cursor.execute("""
        INSERT INTO clients (id, name, industry, preferences)
        VALUES (?, ?, ?, ?)
        """, (cl["id"], cl["name"], cl["industry"], cl["preferences"]))

    # Seed placements
    placements = [
        {
            "id": "PLAC-001",
            "client_id": "CLI-001",
            "role_name": "Senior React Developer",
            "candidate_name": "John Doe",
            "billing_rate": 80.0,
            "placement_date": "2025-01-10",
            "status": "Completed"
        },
        {
            "id": "PLAC-002",
            "client_id": "CLI-001",
            "role_name": "Frontend Lead",
            "candidate_name": "Jane Smith",
            "billing_rate": 90.0,
            "placement_date": "2025-06-15",
            "status": "Ghosted"  # Historic ghosting event
        }
    ]

    for pl in placements:
        cursor.execute("""
        INSERT INTO placements (id, client_id, role_name, candidate_name, billing_rate, placement_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (pl["id"], pl["client_id"], pl["role_name"], pl["candidate_name"], pl["billing_rate"], pl["placement_date"], pl["status"]))

    # Seed benchmarks
    benchmarks = [
        {"role_name": "Senior React Developer", "location": "Remote", "min_salary": 110000.0, "max_salary": 140000.0},
        {"role_name": "Senior React Developer", "location": "Hybrid", "min_salary": 105000.0, "max_salary": 130000.0},
        {"role_name": "Backend Engineer", "location": "Remote", "min_salary": 95000.0, "max_salary": 130000.0}
    ]

    for b in benchmarks:
        cursor.execute("""
        INSERT INTO salary_benchmarks (role_name, location, min_salary, max_salary)
        VALUES (?, ?, ?, ?)
        """, (b["role_name"], b["location"], b["min_salary"], b["max_salary"]))

    # Seed playbooks
    playbooks = [
        {
            "id": "PB-001",
            "title": "Fintech Client Communication Standard",
            "content": "When dealing with fintech clients, emphasize security compliance, long-term employment stability, and deep testing experience (Jest/Cypress). Avoid proposing frequent job hoppers."
        },
        {
            "id": "PB-002",
            "title": "SaaS Agency Pitch Deck Guidelines",
            "content": "For agency positions, speed of matching and hands-on coding delivery matter most. Focus on fast React/Next.js developers who can hit the ground running, even if their stability index is moderate."
        }
    ]

    for p in playbooks:
        cursor.execute("""
        INSERT INTO playbooks (id, title, content)
        VALUES (?, ?, ?)
        """, (p["id"], p["title"], p["content"]))

    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
