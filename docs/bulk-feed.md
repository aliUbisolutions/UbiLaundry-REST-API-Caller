# Bulk Data Feeder

The `/feed` page sends one POST request per row of a CSV or Excel file to any endpoint in the catalogue.

## Difference from Bulk Import

| | Bulk Import | Bulk Data Feeder |
|---|---|---|
| Target endpoint | Fixed (assignment) | Any POST endpoint |
| Payload structure | Nested `{ item: {...} }` | Built from column headers as-is |
| Use case | Assigning items | Feeding any entity type |

## Workflow

### Step 1 — Select endpoint

Choose the target POST endpoint from the dropdown. The expected JSON body template is shown alongside the endpoint URL. Use it to understand which columns your file needs.

### Step 2 — Upload file

Drag-and-drop or click to browse. Supported: `.csv`, `.xlsx`, `.xls`.

Column headers become JSON field names. Use **dot notation** for nested fields:

| Column header | JSON result |
|---|---|
| `name` | `{ "name": "..." }` |
| `category.id` | `{ "category": { "id": ... } }` |
| `address.city` | `{ "address": { "city": "..." } }` |

### Step 3 — Fixed fields

Add key/value pairs that are injected into **every row**. Useful for fields that are constant across the file, such as `@class`.

A JSON preview of the first row is shown so you can verify the payload structure before sending.

### Step 4 — Conversion (optional)

Appears when more than one environment is saved. Select a source environment and conversion tables if your file contains IDs that need to be translated. See [Conversion Tables](conversion-tables.md).

### Step 5 — Send

- **Preview payloads** — inspect the exact JSON for every row before sending.
- **Send N rows** — starts sending with 3 parallel workers.

After completion, only error rows are displayed. Each error row is expandable to show the full request payload and server response.

## Type coercion

Column values are automatically coerced:

| Cell value | JSON type |
|---|---|
| `true` / `false` | boolean |
| Any number string | number |
| `null` or empty | `null` |
| Anything else | string |
