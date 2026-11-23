# Self-hosted Minecraft client storage

The launcher requests exactly `/minecraft/26.3.html` on the Groupcat domain. The Pages Function in `functions/minecraft/[[path]].js` streams that object from Cloudflare R2. This avoids embedding or redirecting to an external Eaglercraft site and avoids the Pages per-file upload limit.

## One-time Cloudflare setup

1. Create an R2 bucket named `groupcat-minecraft`.
2. In the existing Pages project, add an R2 bucket binding with variable name `MINECRAFT` and select `groupcat-minecraft`.
3. Upload the self-contained client HTML file into that bucket and name it exactly `26.3.html`.
4. Redeploy the Pages project.

Important: the official Eaglercraft play page lists 26.3, but its offline-download page currently lists 26.2 and older, not a standalone official 26.3 HTML file. Do not rename a 26.2 client and call it 26.3. The community 26.3-JM build is based on 26.2 with selected features backported, not a complete official 26.3 client. Only upload a client you have the right to host and whose provenance you trust.
