# UbiLaundry REST API Caller

A browser-based tool for calling UbiLaundry REST APIs — bulk imports, data feeds, environment management and ID conversion tables. Built with Next.js 16 and deployable via Docker.

---

## Features

| Feature | Description |
|---|---|
| **API Explorer** | Browse and call any UbiLaundry endpoint from the home page |
| **Bulk Assignment Import** | Upload a CSV/Excel file and send one API call per row (assignment endpoint) |
| **Bulk Data Feeder** | Upload a CSV/Excel file and POST each row to any endpoint |
| **Environments** | Store multiple base-URL + credential sets and switch between them |
| **Conversion Tables** | Translate IDs from one environment to another before sending |

---

## Deployment

### Docker (recommended)

```bash
git clone https://github.com/aliubisolutions/ubilaundry-rest-api-caller.git
cd ubilaundry-rest-api-caller
docker-compose up -d
```

The app is available at **http://localhost:3000**.

### Updating to a new version

```bash
git pull
docker-compose build
docker-compose up -d
```

The version number is shown in the top bar of every page. Use it to confirm you are running the latest build.

### Local development

```bash
npm install
npm run dev
```

---

## Pages

### Home — API Explorer (`/`)

Call individual API endpoints. Select a group and endpoint, fill in the path parameters and request body, then click **Send**. The response (status, headers, body) is shown below.

Configuration (base URL, username, password) is stored in the browser's `localStorage`. Use the **Environments** page to manage multiple configurations.

→ [Detailed documentation](docs/api-explorer.md)

---

### Bulk Assignment Import (`/import`)

Upload a CSV or Excel file where each row represents an item to assign. The page:

1. Parses column headers as field names
2. Builds the correct `{ item: { ... }, reassign, returnValue }` payload for each row
3. Optionally applies **Conversion Tables** to translate IDs from a source environment
4. Shows a **Preview Payloads** panel before sending
5. Sends requests in parallel (3 workers) and displays only error rows after completion
6. Offers a **Retry failed** button to re-send only the failed rows
7. Can generate a **PostgreSQL SQL script** instead of calling the API — useful for large files

→ [Detailed documentation](docs/bulk-import.md)

---

### Bulk Data Feeder (`/feed`)

Same upload flow as the import page, but targets any POST endpoint instead of the fixed assignment endpoint. Column headers become JSON field names; use dot notation (e.g. `category.id`) for nested fields. Fixed fields can be injected into every row.

→ [Detailed documentation](docs/bulk-feed.md)

---

### Environments (`/environments`)

Store named environments (base URL + credentials). Each environment can be:

- **Tested** — calls `/api/getServerTime` to verify connectivity
- **Activated** — writes the credentials to `localStorage` so all pages use them

→ [Detailed documentation](docs/environments.md)

---

### Conversion Tables (`/conversions`)

Map IDs from a source environment to a target environment. Used by the import and feed pages to translate foreign-key values (locations, categories, etc.) before sending.

→ [Detailed documentation](docs/conversion-tables.md)

---

## Architecture

```
src/
  app/
    page.tsx              # Home / API Explorer
    import/page.tsx       # Bulk Assignment Import
    feed/page.tsx         # Bulk Data Feeder
    environments/page.tsx # Environment manager
    conversions/page.tsx  # Conversion table editor
    api/proxy/route.ts    # Server-side proxy (avoids CORS)
  lib/
    endpoints.ts          # Endpoint catalogue
    storage.ts            # localStorage helpers + conversion logic
    version.ts            # APP_VERSION constant
  components/
    ConfigBar.tsx         # Top bar shown on the home page
```

All configuration (environments, conversion tables, active credentials) is persisted in the browser's `localStorage`. No database is required.

The `/api/proxy` server route forwards requests to the UbiLaundry server so that CORS restrictions do not apply.

---

## Version history

| Version | Changes |
|---|---|
| 1.8.8 | Fix `lastseenlocationid` column name typo in SQL export |
| 1.8.7 | Fix `washingcycleseed` column name typo in SQL export |
| 1.8.6 | Skip trailing empty Excel rows in import and SQL export |
| 1.8.5 | Always quote item id as string in SQL export |
| 1.8.4 | Fix non-numeric (EPC/RFID) item IDs appearing as NULL in SQL export |
| 1.8.3 | SQL export: add subclass table (`item_laundry`) INSERT block |
| 1.8.2 | SQL export: download PostgreSQL script from import page |
| 1.8.1 | Retry failed rows on import and feed pages |
| 1.8.0 | Export / import configuration bundle (environments + conversion tables) |
| 1.7.3 | Populate conversion table from source or target environment |
| 1.7.2 | Sort loaded IDs by ID or name in conversion table editor |
| 1.7.1 | Inline rename for conversion tables |
| 1.7.0 | Results tables show error rows only (performance) |
| 1.6.0 | Conversion table fallback strategies (error / default / keep-source) |
| 1.5.0 | Payload preview panel before sending |
| 1.4.0 | Conversion tables and ID translation |
| 1.3.0 | Environments page |
| 1.2.0 | Bulk Data Feeder page |
| 1.1.0 | Bulk Assignment Import page |
| 1.0.0 | Initial release — API Explorer |
