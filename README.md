# Max Rudman — Personal Portfolio

A personal portfolio website, hosted with GitHub Pages. Plain HTML/CSS with a tiny bit of JavaScript and no build step.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | **Home** tab: introduction, at-a-glance numbers, an overview with links into the other tabs, and interests |
| `leadership.html` | **Leadership** tab: on-campus roles (Undergraduate Assembly, University Senate, Dean's Advisory Board, Greek life) |
| `experience.html` | **Experience** tab: off-campus roles (Ethan for Kansas, Camp Sabra, FJC Cornerstone, CommunityAmerica) |
| `academics.html` | **Academics** tab: education, five expandable academic projects, and skills |
| `contact.html` | **Contact** tab: email, LinkedIn, and resume download |
| `styles.css` | Layout, typography, colors, mobile responsiveness. Colors and fonts are variables at the top of the file. |
| `script.js` | Mobile menu, scroll effects, "Expand all" for projects, and opening a project when linked to directly |
| `headshot.jpg` | Photo used on the home page and in link previews |
| `Max_Rudman_Resume.pdf` | Downloadable resume (phone number removed) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are, without running Jekyll |

The menu and footer are repeated at the top and bottom of each page, so if you add or rename a tab,
update the `<ul class="nav-links">` and `<ul class="footer-links">` lists in all five files.

## Publishing with GitHub Pages

1. Open **Settings → Pages** in the repository.
2. Under **Build and deployment**, set Source to **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder, then click **Save**.
4. After a minute or two, the site will be live at `https://maxrudman.github.io/max-rudman-aitoolswebsite-1/`.

## Editing an academic project

In `academics.html`, each project is a `<details class="project">` block:

- `project-title` and `project-meta` (the class) are always visible
- each `<span class="method">` is a method/tool tag shown under the title
- the paragraph in `project-body` is the description, shown after clicking

Any project can be linked to directly, e.g. `academics.html#project-2`, and it opens automatically.

## Linking to a specific item

Most items have an `id`, so you can link straight to them from anywhere, e.g.
`experience.html#story-ethan` or `leadership.html#senate`. Arriving at a linked item briefly highlights it.

## Adding a new section

Copy an existing `<section class="section" id="...">` block on the page you want, and give it a new `id`.
Add `section-alt` to the section's class to get the alternating beige background.

## Preview locally

Open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit http://localhost:8000.
