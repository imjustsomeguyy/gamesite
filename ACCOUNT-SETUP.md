# Account setup (one-time)

The account interface and API are in this repository. To make accounts work, connect a Cloudflare D1 database to the existing Pages project.

1. Open https://dash.cloudflare.com and choose **Workers & Pages**.
2. Open the Pages project connected to this repository.
3. Open **Storage & databases → D1 SQL database** (or create a D1 database from the D1 page). Name it `groupcat-games`.
4. Open the new database's **Console**, paste the contents of `database/schema.sql`, and run it. This creates the account, session and saved-data tables.
5. Return to **Workers & Pages → your Pages project → Settings → Bindings**.
6. Add a **D1 database** binding. Set the variable name to exactly `DB`, then select `groupcat-games`.
7. Save and trigger a new deployment of the Pages project.

After that, users can create accounts and log in. Passwords are stored as salted PBKDF2 hashes; login sessions use secure, HTTP-only cookies. Favourites and recently played games sync to the account. The first setup is required because a static GitHub repository cannot create a Cloudflare database or attach it to your Cloudflare account automatically.

Do not put passwords, API keys or database credentials in the repository.
