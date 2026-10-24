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

// Classify alumni using their actual work and professional details.
function classifyDomain(person) {
    const text = [
        person.job_title,
        person.working_details,
        person.current_company,
        person.domain,
        person.skills,
        person.department
    ]
        .map(value => Array.isArray(value) ? value.join(" ") : value ?? "")
        .join(" ")
        .toLowerCase();

    const rules = [
        {
            domain: "Data & AI",
            keywords: /\b(data scientist|data analyst|machine learning|artificial intelligence|ai engineer|data engineer|deep learning|generative ai)\b/
        },
        {
            domain: "IT & Software",
            keywords: /\b(software engineer|software developer|developer|programmer|information technology|it support|web developer|app developer|cybersecurity|cyber security|devops|cloud engineer|network engineer|technical support|system administrator|full stack|frontend|front end|backend|back end|qa engineer|test engineer|database administrator|database developer|computer engineer)\b/
        },
        {
            domain: "Electrical & Electronics",
            keywords: /\b(electrical|electronics|embedded systems|embedded engineer|vlsi|telecommunication|instrumentation engineer)\b/
        },
        {
            domain: "Mechanical & Manufacturing",
            keywords: /\b(mechanical engineer|automotive|manufacturing|production engineer|industrial engineer|maintenance engineer)\b/
        },
        {
            domain: "Civil & Construction",
            keywords: /\b(civil engineer|construction|structural engineer|site engineer|quantity surveyor)\b/
        },
        {
            domain: "Finance & Accounting",
            keywords: /\b(accountant|accounting|finance|financial analyst|banker|auditor|investment analyst|chartered accountant)\b/
        },
        {
            domain: "Business & Management",
            keywords: /\b(marketing|sales executive|human resources|hr manager|recruiter|business analyst|business development|operations manager|entrepreneur|management consultant|project manager)\b/
        },
        {
            domain: "Education & Research",
            keywords: /\b(teacher|lecturer|professor|researcher|academic|educator|scientist)\b/
        },
        {
            domain: "Healthcare",
            keywords: /\b(doctor|nurse|pharmacist|healthcare|medical officer|clinical|physician)\b/
        },
        {
            domain: "Design",
            keywords: /\b(graphic designer|ui\/ux|ui designer|ux designer|product designer|interior designer|visual designer)\b/
        }
    ];

    for (const rule of rules) {
        if (rule.keywords.test(text)) {
            return rule.domain;
        }
    }

    // Preserve an existing domain if one is already provided.
    if (person.domain && String(person.domain).trim()) {
        return String(person.domain).trim();
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

        // Classify records without changing the database.
        allAlumni = data.map(person => ({
            ...person,
            classified_domain: classifyDomain(person)
        }));

        // Populate passing-year dropdown using available records.
        yearFilter.replaceChildren();
        addOption(yearFilter, "", "All Passout Years");

        const years = new Set();

        allAlumni.forEach(person => {
            const year = String(person.graduation_year ?? "").trim();

            if (/^\d{4}$/.test(year)) {
                years.add(year);
            }
        });

        // Also show the requested range.
        for (let year = 2005; year <= 2026; year++) {
            years.add(String(year));
        }

        [...years]
            .sort((a, b) => Number(b) - Number(a))
            .forEach(year => addOption(yearFilter, year, year));

        // Populate domain dropdown from classified records.
        domainFilter.replaceChildren();
        addOption(domainFilter, "", "All Domains");

        const domains = [
            ...new Set(allAlumni.map(person => person.classified_domain))
        ].sort((a, b) => a.localeCompare(b));

        domains.forEach(domain => addOption(domainFilter, domain, domain));

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

        // Initials avatar.
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = String(person.full_name || "?")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join("");

        // Alumni name.
        const name = document.createElement("h3");
        name.textContent = person.full_name || "Name unavailable";

        // Profession or working details.
        const working = document.createElement("p");
        working.className = "job-title";
        working.textContent =
            person.job_title ||
            person.working_details ||
            "Profession not provided";

        card.append(avatar, name, working);

        // Additional details.
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

        // Skills.
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

        // LinkedIn profile.
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
            .map(value => Array.isArray(value)
                ? value.join(" ")
                : value ?? "")
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

// Load alumni when the page opens.
loadAlumni();
