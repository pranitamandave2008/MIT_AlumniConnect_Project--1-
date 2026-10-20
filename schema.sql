CREATE DATABASE IF NOT EXISTS mit_alumniconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mit_alumniconnect;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','alumni','admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  graduation_year YEAR NOT NULL,
  degree VARCHAR(100) DEFAULT 'B.Tech Computer Science',
  current_company VARCHAR(150) DEFAULT '',
  job_title VARCHAR(150) DEFAULT '',
  skills TEXT,
  linkedin_url VARCHAR(500) DEFAULT '',
  bio TEXT,
  mentor_available BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alumni_name (full_name),
  INDEX idx_alumni_year (graduation_year),
  INDEX idx_alumni_company (current_company)
);

CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  company VARCHAR(150) NOT NULL,
  opportunity_type ENUM('Internship','Full-time','Part-time','Mentorship','Other') DEFAULT 'Internship',
  description TEXT NOT NULL,
  apply_url VARCHAR(500) DEFAULT '',
  application_deadline DATE NULL,
  posted_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Fictional demo data only. Replace with verified records after authorization.
INSERT INTO alumni (full_name, graduation_year, degree, current_company, job_title, skills, linkedin_url, bio, mentor_available) VALUES
('Aarav Deshmukh', 2022, 'B.Tech Computer Science', 'BluePeak Technologies', 'Software Engineer', 'Python, Flask, MySQL, REST APIs', 'https://www.linkedin.com/', 'Fictional demo profile. Interested in helping students understand backend development.', TRUE),
('Isha Kulkarni', 2021, 'B.Tech Computer Science', 'Northstar Analytics', 'Data Analyst', 'SQL, Python, Power BI, Statistics', 'https://www.linkedin.com/', 'Fictional demo profile focused on data analytics and student guidance.', TRUE),
('Rohan Patil', 2020, 'B.Tech Computer Science', 'CloudHarbor Systems', 'Cloud Support Associate', 'Linux, Networking, AWS, Docker', 'https://www.linkedin.com/', 'Fictional demo profile for cloud and infrastructure career exploration.', FALSE),
('Meera Joshi', 2023, 'B.Tech Computer Science', 'PixelRoute Labs', 'Frontend Developer', 'HTML, CSS, JavaScript, React', 'https://www.linkedin.com/', 'Fictional demo profile interested in web development.', TRUE),
('Kabir Shaikh', 2019, 'B.Tech Computer Science', 'SecureLayer Works', 'Security Analyst', 'Networking, Linux, Python, Security basics', 'https://www.linkedin.com/', 'Fictional demo profile for exploring cybersecurity roles.', FALSE);

-- Demo admin: email admin@mitalumniconnect.local, password Admin@123
-- Generate a hash in Python and replace the placeholder below before running schema.sql.
INSERT INTO users (full_name, email, password_hash, role) VALUES
('MIT AlumniConnect Admin', 'admin@mitalumniconnect.local', 'REPLACE_WITH_HASH', 'admin');

INSERT INTO opportunities (title, company, opportunity_type, description, apply_url, application_deadline) VALUES
('Python Developer Intern', 'BluePeak Technologies', 'Internship', 'Fictional sample opportunity. Practice Python fundamentals, Flask routes, and SQL queries.', 'https://example.com/apply', '2027-03-31'),
('Student Career Q&A Session', 'MIT AlumniConnect Community', 'Mentorship', 'Fictional sample event for students to ask alumni about resumes, interviews, and career planning.', 'https://example.com/session', NULL);
