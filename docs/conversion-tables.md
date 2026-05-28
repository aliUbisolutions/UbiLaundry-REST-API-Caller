# Conversion Tables

Conversion tables translate IDs from one environment to another. They are used by the [Bulk Import](bulk-import.md) and [Bulk Data Feeder](bulk-feed.md) pages so that a file exported from one server can be imported into a different server without manually updating every ID.

## Concept

Each row in a conversion table represents one ID mapping:

```
Source ID (env A)  →  Target ID (env B)
       12          →        47
       13          →        51
```

When a field in the payload matches a source ID, it is replaced with the corresponding target ID before the request is sent.

## Creating a table

1. Go to `/conversions` and click **New table**.
2. Give the table a name (e.g. "Locations FR → DE").
3. Select the **source environment** (where the IDs in your file come from).
4. Select the **target environment** (where you are sending).
5. Add one or more **field paths** — the JSON paths in the payload that this table applies to (e.g. `lastSeenLocation`, `category`).
6. Click **Create**.

### Renaming a table

Click the table name in the editor panel. It becomes an editable input. Press **Enter** or click away to save, **Escape** to cancel.

## Adding mappings

### Manually

Click **+ Add mapping row** and type source and target IDs directly.

### Loading from the API

In the editor panel:

1. Select the entity type (Location, Category, etc.).
2. Click **Load from [source env]** to fetch all IDs from the source server.
3. Click **Load from [target env]** to fetch all IDs from the target server.

Once IDs are loaded, three actions become available:

| Action | Description |
|---|---|
| **Populate from [source env]** | Creates one mapping row per source ID, target left blank. Good starting point when the source list is the reference. |
| **Populate from [target env]** | Creates one mapping row per target ID, source left blank. |
| **Auto-match by name** | Pairs source and target IDs that share the same name. Unmatched rows are left with a blank target. |

If the table already has mappings, a confirmation prompt appears before overwriting.

A **Sort by: ID / Name** toggle reorders the dropdowns in all mapping rows without re-fetching from the server.

Review the rows and fill in any that could not be matched automatically.

## Fallback strategy

When a source ID appears in the payload but has no entry in the table, the fallback strategy controls what happens:

| Strategy | Behaviour |
|---|---|
| **Return an error** | The row is skipped and logged as an error. Other rows continue normally. |
| **Use a default target value** | A fixed target ID you specify is used instead. Useful when there is a sensible catch-all. |
| **Keep the source value as-is** | The original ID from the file is sent unchanged. |

The default strategy is **Return an error**.

## Field paths

A field path tells the conversion engine which field(s) in the payload to look at. Paths use dot notation matching the JSON structure:

| JSON payload excerpt | Field path |
|---|---|
| `{ "lastSeenLocation": 12 }` | `lastSeenLocation` |
| `{ "lastSeenLocation": { "id": 12 } }` | `lastSeenLocation.id` |

On the **Import** page, conversion is applied to the flat CSV row **before** the nested payload is built, so paths should match the CSV column names (e.g. `lastSeenLocation`, not `item.lastSeenLocation.id`).

On the **Feed** page, conversion is applied to the already-built JSON object, so paths should match the JSON structure.

One table can cover multiple field paths that share the same ID space (e.g. `lastSeenLocation` and `lastReportLocation` if locations are the same entity type in both environments).

## Storage

Conversion tables are stored in `localStorage` under the key `ubilaundry-conversion-tables`. They are local to the browser and are not shared between users or devices.
