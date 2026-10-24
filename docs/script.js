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

        allAlumni = data;

        // Populate passout years from the database records.
        yearFilter.replaceChildren();
        addOption(yearFilter, "", "All Passout Years");

        const years = [
            ...new Set(
                allAlumni
                    .map(person => person.graduation_year)
                    .filter(year => year !== null && year !== undefined && String(year).trim() !== "")
                    .map(year => String(year).trim())
            )
        ].sort((a, b) => Number(b) - Number(a));

        // Keep the requested year range even if some years have no records.
        for (let year = 2026; year >= 2005; year--) {
            if (!years.includes(String(year))) {
                years.push(String(year));
            }
        }

        years.sort((a, b) => Number(b) - Number(a));

        years.forEach(year => {
            addOption(yearFilter, year, year);
        });

        searchAlumni();

    } catch (error) {
        console.error("Unable to load alumni:", error);
        alumniCount.textContent = "0";
        alumniList.replaceChildren();
        statusMessage.textContent =
            "Unable to load alumni. Please refresh the page or try again later.";
    }
}

function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
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
            "Try changing the passout year, domain, or search keyword.";

        alumniList.appendChild(empty);
        return;
    }

    statusMessage.textContent = `Showing ${alumni.length} alumni`;

    alumni.forEach(person => {
        const card = document.createElement("article");
        card.className = "alumni-card";

        // Initials avatar
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = (person.full_name || "?")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join("");

        // Alumni name
        const name = document.createElement("h3");
        name.textContent = person.full_name || "Name unavailable";

        // Working details
        const working = document.createElement("p");
        working.className = "job-title";
        working.textContent =
            person.working_details ||
            person.job_title ||
            "Working details not provided";

        card.append(avatar, name, working);

        // Additional details
        const details = [
            ["Passout Year", person.graduation_year],
            ["Domain", person.domain],
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

        // Skills
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

        // LinkedIn profile
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
            Array.isArray(person.skills)
                ? person.skills.join(" ")
                : person.skills,
            person.domain,
            person.graduation_year
        ]
            .map(value => value ?? "")
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(query);

        const matchesYear =
            !selectedYear ||
            String(person.graduation_year ?? "").trim() === selectedYear;

        const matchesDomain =
            !selectedDomain ||
            String(person.domain || "").trim().toLowerCase() ===
                selectedDomain.trim().toLowerCase();

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

// Load records when the page opens.
loadAlumni();
