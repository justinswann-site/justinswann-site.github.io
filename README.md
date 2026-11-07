# justinswann.com

Personal portfolio and résumé site for Justin Swann, BI & Data Analytics Product Manager and IT Business Analyst at CoVolt Power.

Hand-coded static site, no build step, hosted on GitHub Pages at **https://www.justinswann.com**.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | The whole site. All content lives here so it is indexable without JavaScript. |
| `assets/css/styles.css` | Mobile-first styles. Below 1024px the page is a business card with a bottom tab bar; at 1024px and up it becomes an app shell with a sidebar. |
| `assets/js/quantum.js` | Background particle field: superposition, observer-effect collapse near the pointer, entangled pairs. |
| `assets/js/bloch.js` | Interactive Bloch sphere in the hero. Hover steers the qubit, click measures it. |
| `assets/js/circuit.js` | Renders the 2026 highlights list as a quantum circuit on desktop. |
| `assets/js/main.js` | Nav state, breadcrumb, reveal-on-scroll, reduce-motion toggle. |
| `CNAME`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `404.html`, `.nojekyll` | GitHub Pages and SEO plumbing. |

## Editing content

- **Work history, skills, education, contact:** edit the matching `<section>` in `index.html`.
- **2026 highlights:** edit the `<ol id="milestones">` list. Each `<li>` carries `data-wire` (0 data platform, 1 applied AI, 2 learning and build), `data-q` (quarter 1 to 4), `data-glyph` (the gate letter), `data-tag`, and optional `data-wip="true"`. The circuit on desktop is generated from this list.
- **Social preview image:** `assets/img/og-image.png` (1200×630).

## Local preview

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/.

## Browser support

Chrome, Firefox, Safari, and Edge, current and recent versions. Only broadly shipped CSS and JS is used; `backdrop-filter` carries the `-webkit-` prefix for Safari, `100dvh` has a `100vh` fallback, and all motion respects `prefers-reduced-motion` plus the on-page toggle.
