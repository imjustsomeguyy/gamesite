# Groupcat Games

A responsive browser-game catalogue for Groupcat.xyz.

## What's included

- Dark, responsive catalogue UI
- Search across game names, descriptions and tags
- Category filters and alphabetical sorting
- Fullscreen iframe player
- Recently played list stored in the browser
- Deep links using `#play=game-id`
- Static files only — no build step or dependencies

## Game collection

The initial catalogue contains 142 entries from [sausi-7/games](https://github.com/sausi-7/games), an MIT-licensed HTML5 game collection.

**Important:** this first version loads the game files from the upstream project's GitHub Pages site inside the player. The catalogue and interface live in this repository, but the individual game files are not yet mirrored here. This keeps the first deployment small and avoids copying game assets without checking each file's requirements. If the upstream host changes or is unavailable, the embedded games may stop loading.

See [ATTRIBUTION.md](ATTRIBUTION.md) for source and licence details.

## Deploy to Cloudflare Pages

1. Open Cloudflare Dashboard → Workers & Pages → Create → Pages.
2. Connect the GitHub repository `imjustsomeguyy/gamesite`.
3. Set the production branch to `main`.
4. Framework preset: **None**.
5. Build command: leave blank.
6. Build output directory: `/` (root).
7. Save and deploy.

The site is plain HTML/CSS/JS, so no build command is required.

## Local preview

Run any static server in this directory, for example:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Adding games

Add a game object to `games.js`. Each entry has an `id`, `name`, `category`, `description`, and playable `path`.
