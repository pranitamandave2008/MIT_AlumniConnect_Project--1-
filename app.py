import os
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "change-this-secret-key")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "mit_alumniconnect"),
}

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def login_required(role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not session.get("user_id"):
                flash("Please log in to continue.", "warning")
                return redirect(url_for("login"))
            if role and session.get("role") != role:
                flash("You do not have permission to access that page.", "danger")
                return redirect(url_for("index"))
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def query_db(sql, params=(), one=False):
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        result = cur.fetchone() if one else cur.fetchall()
        conn.commit()
        cur.close()
        return result
    finally:
        conn.close()

@app.route("/")
def index():
    q = request.args.get("q", "").strip()
    year = request.args.get("year", "").strip()
    company = request.args.get("company", "").strip()
    role = request.args.get("role", "").strip()
    skill = request.args.get("skill", "").strip()
    sql = """SELECT id, full_name, graduation_year, degree, current_company,
                    job_title, skills, linkedin_url, bio
             FROM alumni WHERE 1=1"""
    params = []
    if q:
        sql += " AND (full_name LIKE %s OR current_company LIKE %s OR job_title LIKE %s OR skills LIKE %s)"
        params.extend([f"%{q}%"] * 4)
    if year:
        sql += " AND graduation_year = %s"
        params.append(year)
    if company:
        sql += " AND current_company LIKE %s"
        params.append(f"%{company}%")
    if role:
        sql += " AND job_title LIKE %s"
        params.append(f"%{role}%")
    if skill:
        sql += " AND skills LIKE %s"
        params.append(f"%{skill}%")
    sql += " ORDER BY full_name"
    try:
        alumni = query_db(sql, tuple(params))
        years = query_db("SELECT DISTINCT graduation_year AS year FROM alumni ORDER BY year DESC")
        companies = query_db("SELECT DISTINCT current_company AS company FROM alumni WHERE current_company <> '' ORDER BY company")
        total = query_db("SELECT COUNT(*) AS count FROM alumni", one=True)["count"]
        return render_template("index.html", alumni=alumni, years=years, companies=companies,
                               total=total, q=q, year=year, company=company, role=role, skill=skill)
    except Error as e:
        return render_template("setup_needed.html", error=str(e)), 500

@app.route("/alumni/<int:alumni_id>")
def alumni_detail(alumni_id):
    try:
        person = query_db("SELECT * FROM alumni WHERE id=%s", (alumni_id,), one=True)
    except Error as e:
        return render_template("setup_needed.html", error=str(e)), 500
    if not person:
        flash("Alumni profile not found.", "warning")
        return redirect(url_for("index"))
    return render_template("alumni_detail.html", person=person)

@app.route("/opportunities")
def opportunities():
    try:
        items = query_db("""SELECT * FROM opportunities
                            WHERE application_deadline IS NULL OR application_deadline >= CURDATE()
                            ORDER BY created_at DESC""")
        return render_template("opportunities.html", opportunities=items)
    except Error as e:
        return render_template("setup_needed.html", error=str(e)), 500

@app.route("/mentorship")
def mentorship():
    q = request.args.get("q", "").strip()
    try:
        mentors = query_db("""SELECT id, full_name, graduation_year, current_company, job_title, skills, bio
                              FROM alumni WHERE mentor_available=1
                              AND (%s='' OR full_name LIKE %s OR skills LIKE %s OR job_title LIKE %s)
                              ORDER BY full_name""",
                           (q, f"%{q}%", f"%{q}%", f"%{q}%"))
        return render_template("mentorship.html", mentors=mentors, q=q)
    except Error as e:
        return render_template("setup_needed.html", error=str(e)), 500

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        try:
            user = query_db("SELECT * FROM users WHERE email=%s", (email,), one=True)
        except Error as e:
            return render_template("setup_needed.html", error=str(e)), 500
        if user and check_password_hash(user["password_hash"], password):
            session.update(user_id=user["id"], name=user["full_name"], role=user["role"])
            flash(f"Welcome, {user['full_name']}!", "success")
            return redirect(url_for("admin_dashboard") if user["role"] == "admin" else url_for("index"))
        flash("Email or password is incorrect.", "danger")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))

@app.route("/admin")
@login_required("admin")
def admin_dashboard():
    try:
        alumni_count = query_db("SELECT COUNT(*) AS n FROM alumni", one=True)["n"]
        opportunity_count = query_db("SELECT COUNT(*) AS n FROM opportunities", one=True)["n"]
        alumni = query_db("SELECT id, full_name, graduation_year, current_company, job_title FROM alumni ORDER BY full_name")
        return render_template("admin.html", alumni_count=alumni_count,
                               opportunity_count=opportunity_count, alumni=alumni)
    except Error as e:
        return render_template("setup_needed.html", error=str(e)), 500

@app.route("/admin/alumni/new", methods=["GET", "POST"])
@login_required("admin")
def add_alumni():
    if request.method == "POST":
        data = [request.form.get(k, "").strip() for k in
                ("full_name", "graduation_year", "degree", "current_company", "job_title", "skills", "linkedin_url", "bio")]
        try:
            query_db("""INSERT INTO alumni
                (full_name, graduation_year, degree, current_company, job_title, skills, linkedin_url, bio, mentor_available)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (*data, 1 if request.form.get("mentor_available") else 0))
            flash("Alumni profile added.", "success")
            return redirect(url_for("admin_dashboard"))
        except Error as e:
            flash(f"Could not save profile: {e}", "danger")
    return render_template("alumni_form.html")

@app.route("/admin/alumni/<int:alumni_id>/delete", methods=["POST"])
@login_required("admin")
def delete_alumni(alumni_id):
    try:
        query_db("DELETE FROM alumni WHERE id=%s", (alumni_id,))
        flash("Alumni profile deleted.", "success")
    except Error as e:
        flash(f"Could not delete profile: {e}", "danger")
    return redirect(url_for("admin_dashboard"))

@app.route("/admin/opportunities/new", methods=["GET", "POST"])
@login_required("admin")
def add_opportunity():
    if request.method == "POST":
        values = [request.form.get(k, "").strip() for k in
                  ("title", "company", "opportunity_type", "description", "apply_url", "application_deadline")]
        deadline = values[-1] or None
        try:
            query_db("""INSERT INTO opportunities
                (title, company, opportunity_type, description, apply_url, application_deadline, posted_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (*values[:-1], deadline, session["user_id"]))
            flash("Opportunity posted.", "success")
            return redirect(url_for("opportunities"))
        except Error as e:
            flash(f"Could not post opportunity: {e}", "danger")
    return render_template("opportunity_form.html")

if __name__ == "__main__":
    app.run(debug=True)
