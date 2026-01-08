import os
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


class ResumeAnalyzer:

    ROLE_SKILLS = {

    # ---------------- DATA ROLES ----------------
    "data_science": [
        "Python", "Pandas", "NumPy", "Machine Learning",
        "Statistics", "SQL", "Scikit-learn", "Deep Learning"
    ],

    "data_analytics": [
        "SQL", "Excel", "Power BI", "Tableau",
        "Python", "Data Cleaning", "Data Visualization"
    ],

    "business_analytics": [
        "Requirement Analysis", "Excel", "SQL",
        "Power BI", "Stakeholder Management", "Documentation"
    ],

    "ml_engineer": [
        "Python", "Machine Learning", "Deep Learning",
        "TensorFlow", "PyTorch", "Model Deployment", "MLOps"
    ],

    # ---------------- DEVELOPMENT ----------------
    "full_stack": [
        "HTML", "CSS", "JavaScript", "React",
        "Java", "Spring Boot", "MySQL", "REST API"
    ],

    "frontend": [
        "HTML", "CSS", "JavaScript", "React",
        "Responsive Design", "UI Optimization"
    ],

    "backend": [
        "Python", "Java", "APIs", "Databases",
        "Authentication", "Server-side Logic"
    ],

    "java_dev": [
        "Java", "Spring Boot", "Hibernate",
        "JDBC", "REST API", "MySQL"
    ],

    "python_dev": [
        "Python", "Flask", "Django",
        "APIs", "SQL", "Automation"
    ],

    # ---------------- CLOUD & DEVOPS ----------------
    "cloud_engineer": [
        "AWS", "Azure", "GCP",
        "Cloud Architecture", "IAM", "Networking"
    ],

    "devops": [
        "Docker", "Kubernetes", "CI/CD",
        "AWS", "Linux", "Monitoring"
    ],

    # ---------------- SECURITY ----------------
    "cyber_security": [
        "Network Security", "Ethical Hacking",
        "Vulnerability Assessment", "SIEM", "Firewalls"
    ],

    # ---------------- QA & TESTING ----------------
    "qa": [
        "Manual Testing", "Automation Testing",
        "Selenium", "Test Cases", "Bug Tracking"
    ],

    # ---------------- UI / UX ----------------
    "ui_ux": [
        "Figma", "Wireframing", "Prototyping",
        "User Research", "Design Systems"
    ],

    # ---------------- MOBILE ----------------
    "android": [
        "Java", "Kotlin", "Android SDK",
        "REST API", "Firebase"
    ],

    "ios": [
        "Swift", "iOS SDK",
        "Xcode", "UI Design"
    ],

    # ---------------- EMERGING TECH ----------------
    "ai_engineer": [
        "Python", "Artificial Intelligence",
        "Machine Learning", "Neural Networks",
        "NLP", "Computer Vision"
    ],

    "blockchain": [
        "Blockchain", "Smart Contracts",
        "Solidity", "Web3", "Ethereum"
    ]
}


    def analyze(self, resume_text, role):
        print("ROLE RECEIVED IN ANALYZER:", role)   # 👈 ADD HERE

        skills = self.ROLE_SKILLS.get(role, [])
        matched = [s for s in skills if s.lower() in resume_text.lower()]
        missing = list(set(skills) - set(matched))

        ats_score = int((len(matched) / len(skills)) * 100) if skills else 0

        # 🔥 Try AI API, fallback if fails
        try:
            ai_suggestions = ats_ai_suggestions(
                resume_text,
                role,
                ats_score,
                missing
            )
        except Exception as e:
            print("AI API failed, using fallback:", e)
            ai_suggestions = self.get_suggestions(role, missing)

        return {
            "role": role,
            "ats_score": ats_score,
            "matched_skills": matched,
            "missing_skills": missing,
            "suggestions": ai_suggestions
        }

    def get_suggestions(self, role, missing_skills):
        tips = []

        if role == "data_science":
            tips.append("Add Machine Learning projects with datasets")
            tips.append("Mention model accuracy and evaluation metrics")
        elif role == "data_analytics":
            tips.append("Add dashboards and business insights")
            tips.append("Mention SQL queries and KPIs")
        elif role == "full_stack":
            tips.append("Add GitHub project links")
            tips.append("Mention APIs and deployment")

        for skill in missing_skills[:3]:
            tips.append(f"Consider learning {skill}")

        return tips


def ats_ai_suggestions(resume_text, role, ats_score, missing_skills):
    prompt = f"""
You are an ATS resume optimization expert.

STRICT RULES:
- Resume suggestions ONLY
- ATS keyword optimization ONLY
- NO generic advice
- NO interview tips

Target Role: {role}
ATS Score: {ats_score}%
Missing Skills: {', '.join(missing_skills)}

Resume Content:
{resume_text[:1500]}

Give exactly 5 bullet-point ATS resume suggestions.
"""

    model = genai.GenerativeModel("gemini-pro")
    response = model.generate_content(prompt)

    return [line.strip("-• ") for line in response.text.split("\n") if line.strip()]
