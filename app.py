from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory, jsonify  # ADDED jsonify
import json
import os
from werkzeug.security import generate_password_hash, check_password_hash
import PyPDF2
from db import get_connection
import docx
from resume_analyzer import ResumeAnalyzer
import traceback  
from flask import request, render_template


app = Flask(__name__)
app.secret_key = 'careerconnect_super_secret_key_2026'  # Change this to a strong secret key
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
resume_analyzer = ResumeAnalyzer()  

@app.route("/api/roadmap/<domain>")
def get_roadmap(domain):
    file_path = f"roadmaps/{domain}.json"

    if not os.path.exists(file_path):
        return jsonify({"error": "Roadmap not found"}), 404

    with open(file_path) as f:
        data = json.load(f)

    return jsonify(data)


# Database initialization - KEEP ONLY THIS ONE
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email'].strip().lower()
        password = request.form['password']

        conn = get_connection()
        if conn is None:
            flash("Database connection failed", "error")
            return redirect(url_for('login'))

        cursor = conn.cursor(dictionary=True)


        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        conn.close()

        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['name'] = user['name']
            session['email'] = user['email']
            session['education'] = user.get('education', '')
            session['role'] = user.get('role', '')
            session['skills'] = user.get('skills', '')
            session['experience'] = user.get('experience', '')
            session['location'] = user.get('location', '')
            session['profile_pic'] = user.get('profile_pic', '')
            raw_progress = user.get('progress')

# Dashboard progress must ALWAYS be an integer
            if raw_progress is None:
                session['progress'] = 0
            elif isinstance(raw_progress, (dict, list)):
                session['progress'] = 20
            elif isinstance(raw_progress, str) and raw_progress.strip().startswith('{'):
                session['progress'] = 20
            else:
                session['progress'] = int(raw_progress)




            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'error')

    return render_template('login.html')



# Serve uploaded files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ============ ORIGINAL ROUTES ============

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))



@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('login'))

    raw_progress = session.get('progress')

    if isinstance(raw_progress, (dict, list)):
        progress = 20
    elif isinstance(raw_progress, str) and raw_progress.startswith('{'):
        progress = 20
    else:
        progress = int(raw_progress or 0)

    return render_template(
        'dashboard.html',
        name=session.get('name', 'Guest'),
        email=session.get('email', ''),
        education=session.get('education', 'Not specified'),
        role=session.get('role', 'student'),
        skills=session.get('skills', ''),
        experience=session.get('experience', ''),
        location=session.get('location', ''),
        profile_pic=session.get('profile_pic', ''),
        progress=progress
    )

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':

        # 1️⃣ Get form data
        name = request.form['name']
        user_email = request.form['email'].strip().lower()
        education = request.form['education']
        role = request.form['role']
        password = request.form['password']
        confirm_password = request.form['confirm_password']

        # 2️⃣ Validate passwords
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('signup.html')

        if len(password) < 8:
            flash('Password must be at least 8 characters long', 'error')
            return render_template('signup.html')

        # 3️⃣ Hash password
        hashed_password = generate_password_hash(password)

        # 4️⃣ Insert into database
        try:
            conn = get_connection()
            if conn is None:
                flash('Database connection failed', 'error')
                return render_template('signup.html')

            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO users (name, email, education, role, password, progress)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (name, user_email, education, role, hashed_password, None))

            conn.commit()
            conn.close()

            flash('Account created successfully! Please login.', 'success')
            return redirect(url_for('login'))

        except Exception as e:
            print("SIGNUP ERROR:", e)
            flash('Email already exists or database error', 'error')
            return render_template('signup.html')

    # 5️⃣ GET request
    return render_template('signup.html')



@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully', 'success')
    return redirect(url_for('login'))

# ============ PROFILE EDIT ROUTE ============

@app.route('/profile/edit', methods=['GET', 'POST'])
def edit_profile():
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        print("🔥 SIGNUP POST HIT 🔥")
        # Get form data
        name = request.form.get('name')
        education = request.form.get('education')
        role = request.form.get('role')
        skills = request.form.get('skills', '')
        experience = request.form.get('experience', '')
        location = request.form.get('location', '')
        email = session['email']  # Keep original email
        
        # Handle profile picture upload
        profile_pic = session.get('profile_pic', '')
        if 'profile_pic' in request.files:
            file = request.files['profile_pic']
            if file and file.filename != '':
                # Create uploads directory if it doesn't exist
                if not os.path.exists(app.config['UPLOAD_FOLDER']):
                    os.makedirs(app.config['UPLOAD_FOLDER'])
                
                # Generate unique filename
                
                user_id = session.get('user_id')
                if not user_id:
                    return redirect(url_for('login'))

                filename = f"{user_id}_{file.filename}"

                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                profile_pic = filename
        
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE users
            SET name=%s, education=%s, role=%s,
            skills=%s, experience=%s, location=%s,
            profile_pic=%s
            WHERE email=%s
            """, (name, education, role, skills, experience, location, profile_pic, email))

        conn.commit()
        conn.close()

        # Update session data
        session['name'] = name
        session['education'] = education
        session['role'] = role
        session['skills'] = skills
        session['experience'] = experience
        session['location'] = location
        session['profile_pic'] = profile_pic

        flash('Profile updated successfully!', 'success')
        return redirect(url_for('dashboard'))

            
        
    # GET request - populate form with current data
    return render_template('edit_profile.html',
        name=session.get('name', ''),
        email=session.get('email', ''),
        education=session.get('education', ''),
        role=session.get('role', 'student'),
        skills=session.get('skills', ''),
        experience=session.get('experience', ''),
        location=session.get('location', ''),
        profile_pic=session.get('profile_pic', '')
    )

# ============ HELPER ROUTES ============

@app.route('/test-resume', methods=['GET'])
def test_resume():
    return jsonify({
        "status": "ok",
        "message": "Resume analyzer routes are accessible"
    })

@app.route('/profile/view')
def view_profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Fetch fresh data from database
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email=%s", (session['email'],))
    user = cursor.fetchone()

    conn.close()

    
    if user:
        return render_template(
        'view_profile.html',
        name=user['name'],
        email=user['email'],
        education=user['education'],
        role=user['role'],
        skills=user['skills'],
        experience=user['experience'],
        location=user['location'],
        profile_pic=user['profile_pic'],
        progress=session['progress']
    )

    
    flash('Profile not found', 'error')
    return redirect(url_for('dashboard'))

# ============ RESUME ANALYSIS ROUTES ============

@app.route('/resume/analyze', methods=['GET', 'POST'])
def analyze_resume():

    # user must be logged in
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('login'))

    # 🔹 THIS IS WHERE YOUR CODE GOES
    if request.method == 'POST':
        resume_text = ""
        role = request.form.get('job_role')

        # get uploaded file
        if 'resume_file' in request.files:
            file = request.files['resume_file']

            if file and file.filename:
                if file.filename.endswith('.pdf'):
                    import PyPDF2
                    reader = PyPDF2.PdfReader(file)
                    for page in reader.pages:
                        resume_text += page.extract_text()

                elif file.filename.endswith('.docx'):
                    import docx
                    doc = docx.Document(file)
                    for p in doc.paragraphs:
                        resume_text += p.text

        # validation
        if not resume_text.strip():
            flash("Uploaded file is empty or unreadable", "error")
            return redirect(url_for('analyze_resume'))

# 3️⃣ AI ANALYSIS (ONLY AFTER VALIDATION)
        analysis = resume_analyzer.analyze(resume_text, role)

# 4️⃣ STORE RESULT
        session['last_analysis'] = analysis

# 5️⃣ REDIRECT TO RESULT PAGE
        return redirect(url_for('resume_results'))


    # GET request (page load)
    return render_template('analyze_resume.html', user_role=session.get('role', '')
)

from flask import request, render_template



@app.route('/career-roadmap/domains')
def career_domains():
    career_type = request.args.get('type', 'tech').lower().strip()

    # ---------------- ROLE BASED ----------------
    tech_role_domains = [
        "Frontend", "Backend", "Full Stack", "DevOps", "AI Engineer",
        "Data Analyst", "Cyber Security", "QA", "UX Design",
        "Product Manager", "MLOps"
    ]

    non_tech_role_domains = [
        "HR",
        "Business Analyst",
        "Digital Marketing",
        "Content Writer",
        "Operations",
        "Sales",
        "Finance"
    ]

    # ---------------- SKILL BASED ----------------
    tech_skills = [
        "SQL", "Java", "Python", "React", "JavaScript",
        "Spring Boot", "Node.js", "MongoDB", "Docker", "AWS"
    ]

    non_tech_skills = [
        "Advanced Excel",
        "Business Communication",
        "Power BI",
        "Tableau",
        "SEO Basics",
        "Email Marketing",
        "HR Analytics",
        "Interview Techniques",
        "Presentation Skills",
        "Stakeholder Management"
    ]

    if career_type == "tech":
        return render_template(
            "tech_domains.html",
            title="Developer Roadmaps",
            role_domains=tech_role_domains,
            skill_domains=tech_skills,
            show_skills=True
        )

    # NON-TECH
    return render_template(
        "tech_domains.html",
        title="Non-Tech Career Roadmaps",
        role_domains=non_tech_role_domains,
        skill_domains=non_tech_skills,
        show_skills=True
    )
@app.route('/career-roadmap/steps')
def roadmap_steps():
    role = request.args.get('role')
    skill = request.args.get('skill')

    sample_steps = [
        "Introduction",
        "Core Concepts",
        "Practical Examples",
        "Tools & Techniques",
        "Real-world Use Cases",
        "Mini Project",
        "Interview Preparation"
    ]

    title = role if role else skill

    return render_template(
        "roadmap_steps.html",
        title=title,
        steps=sample_steps
    )


@app.route('/career-roadmap')
def career_roadmap():
    return render_template('career_roadmap.html')


@app.route('/test-analyzer')
def test_analyzer():
    """Test if analyzer works"""
    try:
        test_text = """
        John Doe
        Software Engineer
        Email: john@example.com
        Phone: 123-456-7890
        
        EDUCATION
        Bachelor of Computer Science, University of Technology, 2020
        
        EXPERIENCE
        Software Developer at Tech Corp (2021-Present)
        - Developed web applications using Python and JavaScript
        - Improved system performance by 30%
        - Managed a team of 3 developers
        
        SKILLS
        Python, JavaScript, SQL, Git, AWS
        """
        
        result = resume_analyzer.analyze(test_text, "Software Engineer")
        return jsonify({
            "status": "success",
            "analyzer_working": True,
            "result": result
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "analyzer_working": False,
            "error": str(e)
        })

@app.route('/resume/results')
def resume_results():
    """Show analysis results"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if 'last_analysis' not in session:
        flash('Please analyze a resume first', 'error')
        return redirect(url_for('analyze_resume'))
    
    return render_template('resume_results.html', 
                         analysis=session['last_analysis'])

@app.route('/resume/history')
def resume_history():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    return render_template('resume_history.html', history=[])

# ============ DEBUG ROUTES ============

@app.route('/debug-info')
def debug_info():
    """Debug information page"""
    import sys
    import os
    
    info = {
        "python_version": sys.version,
        "working_directory": os.getcwd(),
        "files_in_directory": os.listdir('.'),
        "resume_analyzer_exists": os.path.exists('resume_analyzer.py'),
        "templates_exists": os.path.exists('templates'),
        "app_running": True
    }
    
    # Try to import resume_analyzer
    try:
        from resume_analyzer import ResumeAnalyzer
        info["resume_analyzer_import"] = "SUCCESS"
        info["analyzer_class"] = str(ResumeAnalyzer)
    except Exception as e:
        info["resume_analyzer_import"] = f"FAILED: {str(e)}"
    
    return jsonify(info)

@app.route('/test-direct')
def test_direct():
    """Direct test of the analyzer"""
    test_text = "John Doe\nSoftware Engineer\nPython, Java, SQL"
    
    try:
        result = resume_analyzer.analyze(test_text)
        return jsonify({
            "status": "success",
            "message": "Analyzer is working!",
            "result": result
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })
@app.route('/learning-paths')
def learning_paths():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    courses = [
        {
            "id": 1,
            "title": "Java Full Stack Developer",
            "category": "Web Development",
            "duration": "4 Months",
            "level": "Beginner → Advanced",
            "rating": 4.8
        },
        {
            "id": 2,
            "title": "Data Science with Python",
            "category": "Data Science",
            "duration": "3 Months",
            "level": "Beginner",
            "rating": 4.7
        },
        {
            "id": 3,
            "title": "Cloud & DevOps",
            "category": "Cloud",
            "duration": "2.5 Months",
            "level": "Intermediate",
            "rating": 4.6
        },
        {
            "id": 4,
            "title": "DSA Mastery",
            "category": "Data Structures",
            "duration": "2 Months",
            "level": "Beginner → Intermediate",
            "rating": 4.9
        }
    ]

    return render_template('learning_paths.html', courses=courses)

@app.route('/course/<int:course_id>')
def course_details(course_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))

    courses = {
        1: {
            "title": "Java Full Stack Developer",
            "description": "Learn Core Java, Spring Boot, MySQL, REST APIs, and React with real projects.",
            "start_date": "15 Feb 2026",
            "time": "7:00 PM – 9:00 PM",
            "duration": "4 Months"
        },
        2: {
            "title": "Data Science with Python",
            "description": "Python, Pandas, NumPy, Machine Learning, and hands-on projects.",
            "start_date": "20 Feb 2026",
            "time": "6:00 PM – 8:00 PM",
            "duration": "3 Months"
        },
        3: {
            "title": "Cloud & DevOps",
            "description": "AWS, Docker, Kubernetes, CI/CD pipelines.",
            "start_date": "25 Feb 2026",
            "time": "8:00 PM – 9:30 PM",
            "duration": "2.5 Months"
        },
        4: {
            "title": "DSA Mastery",
            "description": "Data Structures and Algorithms from basics to advanced.",
            "start_date": "10 Feb 2026",
            "time": "5:00 PM – 6:30 PM",
            "duration": "2 Months"
        }
    }

    course = courses.get(course_id)
    if not course:
        flash("Course not found", "error")
        return redirect(url_for('learning_paths'))

    return render_template('course_details.html', course=course)

@app.route('/mock-interviews')
def mock_interviews():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    roles = ["Java Developer", "Frontend Developer", "Data Analyst"]
    return render_template('mock_interviews.html', roles=roles)

@app.route('/certifications')
def certifications():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    courses = [
        {"name": "Google Data Analytics", "platform": "Coursera"},
        {"name": "Java Spring Boot", "platform": "Udemy"},
        {"name": "AWS Cloud Practitioner", "platform": "AWS"}
    ]

    return render_template('certifications.html', courses=courses)

@app.route('/mentors')
def mentors():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    mentors = [
        {"name": "Rahul Sharma", "expertise": "Java", "experience": "8 yrs"},
        {"name": "Anita Verma", "expertise": "Data Science", "experience": "6 yrs"}
    ]

    return render_template('mentors.html', mentors=mentors)

# ============ END OF ROUTES ============

# ============ END OF ROUTES ============

if __name__ == '__main__':
    # Ensure upload folder exists
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    
    print("=" * 50)
    print("Starting Career Connect Application")
    print("=" * 50)
    
    # Test the analyzer on startup
    
    app.run(debug=True)