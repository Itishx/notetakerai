---
name: linkedin-jobs
description: Use this skill when Braino needs to search LinkedIn Jobs for a role and location, read multiple postings, return links and descriptions, and give a fit recommendation. Trigger for: "search data analyst jobs in hyd", "find LinkedIn jobs for product analyst in Bengaluru", "show remote frontend roles on LinkedIn".
---

# LinkedIn Jobs Skill

Scope: job discovery and fit analysis only. Never apply, save, message, or connect unless the user explicitly asks and confirms.

## Output Goal

3-5 relevant jobs. Inspect at least 3 jobs when LinkedIn shows 3+ relevant results. Do not stop after 1 job unless the user explicitly asks for one job or LinkedIn has fewer than 3 relevant results. Each job needs: title, company, location, link, short description, key requirements, fit verdict (Strong / Maybe / Weak + reason), plus a final conclusion.

## Workflow

1. Parse role + location. Expand shortcuts: `hyd` -> Hyderabad, `blr` -> Bengaluru.
2. Go to `https://www.linkedin.com/jobs/search/?keywords=ROLE&location=CITY`; URL-encode role and city.
3. If a login wall appears, stop and ask the user to log in.
4. Apply only filters the user requested. Never invent filters.
5. Scan the results list first. Click only cards that clearly match role + location.
6. Open one job at a time; wait briefly for the details pane to update before reading.
7. If the description is truncated, click `Show more` / `See more`.
8. Read job details with `maxChars: 3500` so the description and requirements are not cut off.
9. Capture all required fields before moving to the next job. Capture link from card/title `href` first, current URL second.
10. Stop at 3-5 good jobs. Minimum 3 if available; target 5 when results are easy to inspect. Do not return done after only one job unless fewer than 3 relevant jobs exist.

## Locators

**Search inputs**
- `[aria-label*="Search by title"]`, `[aria-label*="Search jobs"]`, `input[id*="jobs-search-box-keyword"]`

**Location input**
- `[aria-label*="City"]`, `[aria-label*="location"]`, `input[id*="jobs-search-box-location"]`

**Filter buttons** (use `targetText`)
- `Date posted`, `Experience level`, `Remote`, `Easy Apply`, `Job type`

**Job cards**
- `[data-job-id]`, `.job-card-container`, `.jobs-search-results__list-item`, `.job-card-list__title`, `.job-card-container__link`

**Job details**
- `.jobs-search__job-details--container`, `.jobs-details`, `.jobs-description`, `.jobs-box__html-content`, `[class*="jobs-description"]`, `main`

## Fit Rules

- Never invent resume details, degree, or years of experience.
- If no profile context exists, state fit is based on the job description alone.
- **Strong** — requirements clearly match known user profile or target role.
- **Maybe** — partial match; some requirements are missing or unclear.
- **Weak** — major mismatch in experience, location, seniority, or stack.
- Always name the single biggest missing requirement.

## Output Format

```markdown
## Jobs I looked at for you in "{Location}" for "{Role}"

- **{Title} – {Company}** ({Location})
  Link: {URL}
  Description: {1–2 sentence summary}
  Requirements: {comma-separated key requirements}
  Fit: {Strong / Maybe / Weak} — {reason}

Final conclusion: {Braino's honest take on which jobs to open/apply to first and what skill gap matters most.}
```
