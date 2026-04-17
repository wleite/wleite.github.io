# CLAUDE.md

Personal blog and portfolio site for Willian Leite, built with Jekyll and the Chirpy theme. Hosted at https://wleite.com via GitHub Pages.

## Stack

- **Jekyll** (Ruby static site generator) with **jekyll-theme-chirpy v7.1.1**
- **Bootstrap 5.3.3** (CSS framework)
- **Rollup + Babel** (JavaScript bundling)
- **PurgeCSS** (CSS optimization for production)
- **GitHub Pages** (deployment, automatic on push to `master`)

## Local Development

```bash
bundle install       # Install Ruby gems
npm install          # Install Node dependencies
npm run build        # Build CSS and JS assets
bundle exec jekyll s # Serve at http://localhost:4000
```

Or use the convenience script: `bash tools/run.sh`

## Writing Blog Posts

Posts live in `_posts/` with the filename format `YYYY-MM-DD-slug.md`.

Required front matter:

```yaml
---
layout: post
title: Post Title
date: YYYY-MM-DD HH:MM -0600
categories: [Category1, Category2]
tags: [tag1, tag2, tag3]
---
```

## Project Structure

```
_posts/       # Blog posts (Markdown)
_tabs/        # Static pages: About, Archives, Categories, Tags
_data/        # YAML data: authors, contact, sharing options
_layouts/     # HTML templates (Liquid)
_includes/    # Reusable HTML fragments
_javascript/  # JS source files (bundled by Rollup)
_sass/        # SCSS stylesheets
assets/       # Compiled output (JS, CSS, images)
_config.yml   # Main Jekyll configuration
```

## Commit Conventions

Conventional Commits are enforced via Husky + Commitlint:

```
feat(blog): add new post about cloud architecture
fix: correct broken link in footer
chore: update dependencies
```

Types: `feat`, `fix`, `perf`, `refactor`, `chore`

## npm Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Build all assets (CSS + JS) |
| `npm run build:css` | Build and purge CSS |
| `npm run build:js` | Bundle and minify JS |
| `npm run watch:js` | Watch JS for changes |
| `npm run lint:scss` | Lint SCSS files |

## CI/CD

- **`pages-deploy.yml`** — Builds and deploys to GitHub Pages on push to `master`
- **`ci.yml`** — Runs tests across Ruby 3.1, 3.2, 3.3 on push/PR
- **`commitlint.yml`** — Validates commit message format
- **`style-lint.yml`** — SCSS linting

HTML links are validated by `htmlproofer` in CI (internal links only; external links are ignored).

## Configuration

Key settings in `_config.yml`:
- Site URL: `https://wleite.com`
- Timezone: `America/Chicago`
- Permalink: `/posts/:title/`
- TOC enabled globally
- Pagination: 10 posts per page
- PWA enabled

Author info in `_data/authors.yml`, social links in `_data/contact.yml`.
