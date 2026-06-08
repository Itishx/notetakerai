---
name: linkedin-jobs
description: Use this skill when Braino needs to search LinkedIn Jobs for a role/location, inspect multiple job postings, return job links and descriptions, and recommend whether the user looks like a good fit. Trigger for requests like "search data analyst jobs in hyd", "find LinkedIn jobs for product analyst in Bengaluru", or "show remote frontend roles on LinkedIn".
---

# LinkedIn Jobs

Use this skill for LinkedIn job discovery and fit analysis. Do not use it for general LinkedIn people search, messaging, posting, or recruiter outreach.

## Goal

Return 3-5 relevant jobs with:

- job title
- company
- location
- job link
- short description
- key requirements
- honest fit recommendation

Never apply, save, message, connect, or click Easy Apply unless the user explicitly asks and confirms.

## Workflow

1. Parse the requested role and location. Normalize common city shortcuts, for example `hyd` -> `Hyderabad`, `blr` -> `Bengaluru`.
2. Navigate directly to `https://www.linkedin.com/jobs/search/?keywords=ROLE&location=CITY`.
3. Wait for LinkedIn to load. If a login wall appears, ask the user to log in.
4. Apply only user-requested filters. Do not invent filters. Common filters: Remote, Date posted, Experience level, Job type, Easy Apply.
5. Read the results list before clicking. Prefer job cards that clearly match the requested role/location.
6. Open one job at a time. After every click, wait and verify the job details pane or page changed.
7. If the description is collapsed, click `Show more` or `See more`.
8. Read the job details with enough text for real fit analysis.
9. Remember each job before moving to the next.
10. Stop after 3-5 useful jobs, or sooner if LinkedIn has no more relevant results.

## Browser Locators

Search keyword input:

- `[aria-label*="Search by title"]`
- `[aria-label*="Search jobs"]`
- `[placeholder*="Search jobs"]`
- `input[id*="jobs-search-box-keyword"]`

Location input:

- `[aria-label*="City"]`
- `[aria-label*="location"]`
- `input[id*="jobs-search-box-location"]`

Filter buttons:

- `targetText="Date posted"`
- `targetText="Experience level"`
- `targetText="Remote"`
- `targetText="Easy Apply"`
- `targetText="Job type"`

Job cards:

- `[data-job-id]`
- `.job-card-container`
- `.jobs-search-results__list-item`
- `.job-card-list__title`
- `.job-card-container__link`

Job details:

- `.jobs-search__job-details--container`
- `.jobs-details`
- `.jobs-description`
- `.jobs-box__html-content`
- `[class*="jobs-description"]`
- `main`

## Fit Recommendation Rules

- Do not invent the user's resume, degree, company history, or years of experience.
- If no user profile/resume context is available, say the fit is based only on the job description.
- A strong fit means the role requirements match what is known about the user or the requested target role.
- A maybe fit means requirements are partly missing or unclear.
- A weak fit means the role asks for major experience, location, seniority, or stack mismatches.
- Always mention the biggest missing requirement honestly.

## Final Answer Format

Use markdown:

```markdown
## LinkedIn jobs found

- **Title - Company** (Location)
  Link: URL
  Description: short summary
  Requirements: key requirements
  Fit: Strong / Maybe / Weak - reason
```
