# Environments

The `/environments` page lets you store multiple UbiLaundry server configurations and switch between them without re-entering credentials each time.

## Fields

| Field | Description |
|---|---|
| **Name** | A human-readable label, e.g. "Production France" |
| **Base URL** | Root URL of the server, e.g. `https://prod-fr.example.com` |
| **Username** | Basic-auth username (leave blank if the server has no auth) |
| **Password** | Basic-auth password |

## Actions

### Test

Sends a `GET /api/getServerTime` request to the environment's base URL and reports the HTTP status and response time. Use this to verify connectivity before activating.

### Activate

Writes the environment's base URL and credentials to `localStorage` as the active configuration. All pages (API Explorer, Import, Feed) will use this configuration immediately — no page reload is required.

### Edit

Opens the edit modal to update any field. Changes are saved to `localStorage`.

### Delete

Removes the environment from `localStorage`. This does not affect the currently active configuration unless you explicitly activate a different environment.

## Storage

Environments are stored in `localStorage` under the key `ubilaundry-environments`. They are local to the browser and are not shared between users or devices.

## Relationship to Conversion Tables

When creating a [Conversion Table](conversion-tables.md), you select a source and a target environment from the list defined here. Make sure the relevant environments are created before creating conversion tables.
