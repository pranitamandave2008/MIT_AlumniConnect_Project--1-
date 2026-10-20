# MIT AlumniConnect

A student-friendly CEP prototype that combines five features in one portal:
1. Searchable alumni directory
2. Alumni profiles
3. Career opportunities
4. Mentorship and networking
5. Admin dashboard for managing records

The included alumni and opportunities are **fictional demo records**. Do not publish private alumni data without college authorization and appropriate consent.

## Requirements
- Python 3.10+
- MySQL Server
- A terminal / command prompt

## Setup

### 1. Create a virtual environment
Windows:
```bat
py -m venv venv
venv\Scripts\activate
```
macOS/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Prepare the database
Open MySQL Workbench or the MySQL command line and run `schema.sql`.
Before running it, generate a password hash:
```bash
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('Admin@123'))"
```
Copy the output and replace `REPLACE_WITH_HASH` in `schema.sql` with that hash. Then run the SQL file in MySQL Workbench or:
```bash
mysql -u root -p < schema.sql
```

If you already ran the SQL file with the placeholder, update the admin password hash after generating it:
```sql
USE mit_alumniconnect;
UPDATE users
SET password_hash = 'PASTE_GENERATED_HASH_HERE'
WHERE email = 'admin@mitalumniconnect.local';
```

### 4. Configure MySQL connection
Set environment variables if your MySQL settings are not the defaults.

Windows Command Prompt:
```bat
set DB_HOST=localhost
set DB_USER=root
set DB_PASSWORD=YOUR_MYSQL_PASSWORD
set DB_NAME=mit_alumniconnect
```

PowerShell:
```powershell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
$env:DB_NAME="mit_alumniconnect"
```

macOS/Linux:
```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD='YOUR_MYSQL_PASSWORD'
export DB_NAME=mit_alumniconnect
```

### 5. Run the website
```bash
python app.py
```
Open `http://127.0.0.1:5000`.

Admin login:
- Email: `admin@mitalumniconnect.local`
- Password: `Admin@123` (works only after you replace the placeholder with the generated hash)

## Pages
- `/` — alumni search with keyword, graduation year, company, role, and skill filters
- `/alumni/<id>` — alumni profile
- `/opportunities` — internships and career opportunities
- `/mentorship` — alumni available for mentoring
- `/login` — role-based login
- `/admin` — admin dashboard (admin only)
- `/admin/alumni/new` — add an alumni record
- `/admin/opportunities/new` — post an opportunity (admin login required)

## Before presenting / deploying
- Change `SECRET_KEY`.
- Replace fictional records with approved, verified records.
- Validate profile URLs and contact details.
- Add CSRF protection, rate limiting, password reset, email verification, and more robust audit logging before public deployment.
- The demo uses a simple admin-created account flow; self-registration is not included.
