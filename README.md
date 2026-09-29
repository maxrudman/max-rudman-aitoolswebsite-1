# Max Rudman — Personal Portfolio

A personal portfolio website, hosted with GitHub Pages. Plain HTML/CSS with a tiny bit of JavaScript and no build step.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | All the page content: hero, about, highlights, experience, leadership, education, skills, contact |
| `styles.css` | Layout, typography, colors, mobile responsiveness. Colors and fonts are variables at the top of the file. |
| `script.js` | Mobile menu, header shadow on scroll, fade-in animations, and footer year |
| `headshot.jpg` | Photo used in the hero section and in link previews |
| `Max_Rudman_Resume.pdf` | Downloadable resume (phone number removed) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are, without running Jekyll |

## Publishing with GitHub Pages

1. Open **Settings → Pages** in the repository.
2. Under **Build and deployment**, set Source to **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder, then click **Save**.
4. After a minute or two, the site will be live at `https://maxrudman.github.io/max-rudman-aitoolswebsite-1/`.

## Adding a new section

Copy one of the existing `<section class="section" id="...">` blocks in `index.html`, give it a new `id`,
and add a matching link to the `<ul class="nav-links">` list. Add `section-alt` to the section's class
to get the alternating beige background.

## Preview locally

Open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit http://localhost:8000.
