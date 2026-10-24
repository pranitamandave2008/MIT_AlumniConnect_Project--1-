
const alumniList = document.getElementById("alumni-list");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const resetButton = document.getElementById("reset-button");
const yearFilter = document.getElementById("year-filter");
const domainFilter = document.getElementById("domain-filter");
const alumniCount = document.getElementById("alumni-count");
const statusMessage = document.getElementById("status-message");

let allAlumni = [];

async function loadAlumni() {
    statusMessage.textContent = "Loading alumni...";

    try {
        const response = await fetch("https://mit-alumniconnect-project-1-1.onrender.com/api/alumni"
);

        if (!response.ok) {
            throw new Error("Could not load alumni records.");
        }

        allAlumni = await response.json();

        // Show every passout year from 2005 to 2026
        yearFilter.replaceChildren();
        addOption(yearFilter, "", "All Passout Years");

        for (let year = 2026; year >= 2005; year--) {
            addOption(yearFilter, String(year), String(year));
        }

        // Keep domain options from the HTML file
        searchAlumni();

    } catch (error) {
        console.error(error);
        alumniCount.textContent = "0";
        alumniList.replaceChildren();
        statusMessage.textContent =
            "Unable to load alumni. Please check the backend connection.";;
    }
}

function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
}

function displayAlumni(alumni) {
    alumniCount.textContent = alumni.length;
    alumniList.replaceChildren();

    if (alumni.length === 0) {
        statusMessage.textContent = "No matching alumni found.";

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

        // Initials avatar - no photos
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

        // Working details from imported Excel data
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

        // Skills, if available
        if (person.skills) {
            const skills = document.createElement("div");
            skills.className = "skills";

            person.skills
                .split(",")
                .map(skill => skill.trim())
                .filter(Boolean)
                .forEach(skill => {
                    const tag = document.createElement("span");
                    tag.className = "skill-tag";
                    tag.textContent = skill;
                    skills.appendChild(tag);
                });

            card.appendChild(skills);
        }

        // LinkedIn profile link
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
            person.graduation_year
        ]
            .map(value => value ?? "")
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(query);

        const matchesYear =
            !selectedYear ||
            String(person.graduation_year) === selectedYear;

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

loadAlumni();
