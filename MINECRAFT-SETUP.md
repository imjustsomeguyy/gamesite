# Self-hosted Minecraft client storage

The launcher requests exactly `/modern-mc/26.3.html` on the Groupcat domain. The Pages Function in `functions/modern-mc/[[path]].js` streams that object from Cloudflare R2. The game itself will load from your Groupcat domain; it will not redirect to or iframe an external Eaglercraft site.

## Client file to use

The selected build is **26.3-JM**, a community-modified build based on Eaglercraft 26.2 with selected 26.3 features backported. It is not an official, complete Minecraft 26.3 client.

[Download 26.3-fixed.html (85.8 MB)](https://github.com/joeymavv/26.3-JM/releases/download/v26.3-jm.1/26.3-fixed.html)

Download that file, then upload it into the R2 bucket using the exact object name `26.3.html`.

## One-time Cloudflare setup

1. Create an R2 bucket named `groupcat-minecraft`.
2. In the existing Pages project, add an R2 bucket binding with variable name `MINECRAFT` and select `groupcat-minecraft`.
3. Upload the downloaded `26.3-fixed.html` file into that bucket and name it exactly `26.3.html`.
4. Redeploy the Pages project.

**The game is not live until the file is uploaded and the R2 binding is connected.** I can update the website code, but I cannot access your Cloudflare account or upload into your R2 bucket from this connection.
