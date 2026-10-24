const alumniList = document.getElementById("alumni-list");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const resetButton = document.getElementById("reset-button");
const yearFilter = document.getElementById("year-filter");
const domainFilter = document.getElementById("domain-filter");
const alumniCount = document.getElementById("alumni-count");
const statusMessage = document.getElementById("status-message");

const API_URL =
    "https://mit-alumniconnect-project-1-1.onrender.com/api/alumni";

let allAlumni = [];

const DOMAIN_CATEGORIES = [
    "IT",
    "Web Development",
    "Software Development",
    "AI/ML",
    "Data Science",
    "Cybersecurity",
    "Cloud Computing",
    "Networking",
    "Database Management",
    "Mobile App Development",
    "Embedded Systems",
    "Other / Not specified"
];

// Normalize different spellings of existing domain values.
function normalizeDomain(value) {
    const domain = String(value || "").trim().toLowerCase();

    const aliases = {
        "it": "IT",
        "information technology": "IT",
        "web development": "Web Development",
        "web developer": "Web Development",
        "software development": "Software Development",
        "software engineering": "Software Development",
        "ai": "AI/ML",
        "ai/ml": "AI/ML",
        "artificial intelligence": "AI/ML",
        "machine learning": "AI/ML",
        "data science": "Data Science",
        "data analytics": "Data Science",
        "cyber security": "Cybersecurity",
        "cybersecurity": "Cybersecurity",
        "cloud": "Cloud Computing",
        "cloud computing": "Cloud Computing",
        "networking": "Networking",
        "database management": "Database Management",
        "mobile app development": "Mobile App Development",
        "mobile application development": "Mobile App Development",
        "embedded systems": "Embedded Systems",
        "other": "Other / Not specified",
        "other / not specified": "Other / Not specified"
    };

    return aliases[domain] || null;
}

// Classify using professional details rather than company name alone.
function classifyDomain(person) {
    // Prefer a valid domain already provided in the dataset.
    const existingDomain = normalizeDomain(person.domain);

    if (existingDomain) {
        return existingDomain;
    }

    const text = [
        person.job_title,
        person.working_details,
        person.skills,
        person.department
    ]
        .map(value =>
            Array.isArray(value) ? value.join(" ") : value ?? ""
        )
        .join(" ")
        .toLowerCase();

    const rules = [
        {
            domain: "AI/ML",
            pattern: /\b(ai\/ml|artificial intelligence|machine learning|deep learning|ml engineer|ai engineer|generative ai|nlp|natural language processing)\b/
        },
        {
            domain: "Data Science",
            pattern: /\b(data scientist|data science|data analyst|data analytics|data engineer|business intelligence|big data|bi analyst)\b/
        },
        {
            domain: "Cybersecurity",
            pattern: /\b(cybersecurity|cyber security|information security|security analyst|penetration tester|ethical hacking|soc analyst)\b/
        },
        {
            domain: "Cloud Computing",
            pattern: /\b(cloud computing|cloud engineer|cloud architect|aws|azure|google cloud|devops|site reliability engineer|sre)\b/
        },
        {
            domain: "Database Management",
            pattern: /\b(database administrator|database management|database developer|database engineer|dba|sql developer|oracle database|mongodb administrator)\b/
        },
        {
            domain: "Mobile App Development",
            pattern: /\b(mobile app|mobile application|android developer|ios developer|flutter developer|react native|mobile developer)\b/
        },
        {
            domain: "Embedded Systems",
            pattern: /\b(embedded systems|embedded software|embedded engineer|firmware engineer|microcontroller|iot engineer|vlsi)\b/
        },
        {
            domain: "Networking",
            pattern: /\b(network engineer|network administrator|networking|ccna|routing and switching|telecommunications engineer)\b/
        },
        {
            domain: "Web Development",
            pattern: /\b(web developer|web development|frontend developer|front-end developer|front end developer|backend developer|back-end developer|back end developer|full stack developer|full-stack developer|html|css|javascript|react\.?js|angular|vue\.?js)\b/
        },
        {
            domain: "Software Development",
            pattern: /\b(software developer|software development|software engineer|application developer|programmer|qa engineer|test automation engineer)\b/
        },
        {
            domain: "IT",
            pattern: /\b(information technology|it support|technical support|system administrator|systems administrator|help desk|it analyst|computer operator)\b/
        }
    ];

    for (const rule of rules) {
        if (rule.pattern.test(text)) {
            return rule.domain;
        }
    }

    return "Other / Not specified";
}

function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
}

async function loadAlumni() {
    statusMessage.textContent = "Loading alumni...";
    alumniCount.textContent = "0";
    alumniList.replaceChildren();

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("The API did not return an alumni list.");
        }

        allAlumni = data.map(person => ({
            ...person,
            classified_domain: classifyDomain(person)
        }));

        // Populate the passing-year dropdown.
        yearFilter.replaceChildren();
        addOption(yearFilter, "", "All Passout Years");

        const years = new Set();

        allAlumni.forEach(person => {
            const year = String(person.graduation_year ?? "").trim();

            if (/^\d{4}$/.test(year)) {
                years.add(year);
            }
        });

        for (let year = 2005; year <= 2026; year++) {
            years.add(String(year));
        }

        [...years]
            .sort((a, b) => Number(b) - Number(a))
            .forEach(year => addOption(yearFilter, year, year));

        // Populate the domain dropdown with the existing categories.
        domainFilter.replaceChildren();
        addOption(domainFilter, "", "All Domains");

        DOMAIN_CATEGORIES.forEach(domain => {
            addOption(domainFilter, domain, domain);
        });

        searchAlumni();

    } catch (error) {
        console.error("Unable to load alumni:", error);
        alumniCount.textContent = "0";
        alumniList.replaceChildren();
        statusMessage.textContent =
            "Unable to load alumni. Please refresh and try again.";
    }
}

function displayAlumni(alumni) {
    alumniCount.textContent = String(alumni.length);
    alumniList.replaceChildren();

    if (alumni.length === 0) {
        statusMessage.textContent = allAlumni.length === 0
            ? "No alumni records are available."
            : "No matching alumni found.";

        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent =
            "Try another name, company, profession, passing year, or domain.";

        alumniList.appendChild(empty);
        return;
    }

    statusMessage.textContent = `Showing ${alumni.length} alumni`;

    alumni.forEach(person => {
        const card = document.createElement("article");
        card.className = "alumni-card";

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = String(person.full_name || "?")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join("");

        const name = document.createElement("h3");
        name.textContent = person.full_name || "Name unavailable";

        const working = document.createElement("p");
        working.className = "job-title";
        working.textContent =
            person.job_title ||
            person.working_details ||
            "Profession not provided";

        card.append(avatar, name, working);

        const details = [
            ["Passout Year", person.graduation_year],
            ["Domain", person.classified_domain],
            ["Company", person.current_company],
            ["Location", person.location],
            ["Department", person.department]
        ];

        details.forEach(([label, value]) => {
            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {
                const detail = document.createElement("p");
                detail.className = "card-detail";
                detail.textContent = `${label}: ${value}`;
                card.appendChild(detail);
            }
        });

        if (person.skills) {
            const skills = document.createElement("div");
            skills.className = "skills";

            const skillList = Array.isArray(person.skills)
                ? person.skills
                : String(person.skills).split(",");

            skillList
                .map(skill => String(skill).trim())
                .filter(Boolean)
                .forEach(skill => {
                    const tag = document.createElement("span");
                    tag.className = "skill-tag";
                    tag.textContent = skill;
                    skills.appendChild(tag);
                });

            card.appendChild(skills);
        }

        if (person.linkedin_url) {
            const linkedin = document.createElement("a");
            linkedin.href = person.linkedin_url;
            linkedin.textContent = "View LinkedIn Profile ↗";
            linkedin.target = "_blank";
            linkedin.rel = "noopener noreferrer";
            linkedin.className = "linkedin-link";

            card.appendChild(linkedin);
        }

        alumniList.appendChild(card);
    });
}

function searchAlumni() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedYear = yearFilter.value;
    const selectedDomain = domainFilter.value;

    const filtered = allAlumni.filter(person => {
        const searchableText = [
            person.full_name,
            person.current_company,
            person.job_title,
            person.working_details,
            person.location,
            person.department,
            person.skills,
            person.domain,
            person.classified_domain,
            person.graduation_year,
            person.linkedin_url
        ]
            .map(value =>
                Array.isArray(value) ? value.join(" ") : value ?? ""
            )
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(query);

        const matchesYear =
            !selectedYear ||
            String(person.graduation_year ?? "").trim() === selectedYear;

        const matchesDomain =
            !selectedDomain ||
            person.classified_domain === selectedDomain;

        return matchesSearch && matchesYear && matchesDomain;
    });

    displayAlumni(filtered);
}

function resetFilters() {
    searchInput.value = "";
    yearFilter.value = "";
    domainFilter.value = "";
    searchAlumni();
}

searchButton.addEventListener("click", searchAlumni);
searchInput.addEventListener("input", searchAlumni);
yearFilter.addEventListener("change", searchAlumni);
domainFilter.addEventListener("change", searchAlumni);
resetButton.addEventListener("click", resetFilters);

loadAlumni();
