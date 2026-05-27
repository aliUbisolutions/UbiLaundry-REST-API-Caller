# Bulk Assignment Import

The `/import` page sends one assignment API call per row of a CSV or Excel file.

## Supported file formats

- `.csv` (comma-separated)
- `.xlsx` / `.xls` (Excel)

The first row must be a header row. Each column header is used as a field name.

## Required columns

The page builds the UbiLaundry assignment payload automatically. The following column names are recognised:

| Column | Maps to |
|---|---|
| `id` | `item.id` |
| `@class` | `item.@class` (use a Fixed Field if all rows share the same class) |
| `category` | `item.category.id` |
| `lastSeenLocation` | `item.lastSeenLocation.id` |
| `lastSeenWorkstation` | `item.lastSeenWorkstation.id` |
| `lastMovementType` | `item.lastMovementType.id` |
| `lastReportLocation` | `item.lastReportLocation.id` |
| `itemType` | `item.itemType.id` |
| `container` | `item.container.id` |
| `client` | `item.client.id` |
| `department` | `item.department.id` |
| `holder` | `item.holder.id` |
| `owner` | `item.owner.id` |
| `locationtype` | `item.locationtype.id` |
| `encodingDate`, `firstSeenDate`, `lastSeenDate`, … | `item.<field>` as ISO string |
| `killed` | `item.killed` as boolean |
| Any other column | `item.<columnName>` as-is |

The final payload sent to the API is:

```json
{
  "item": {
    "@class": "...",
    "id": 123,
    "attributeLinks": [],
    "category": { "id": 5 },
    "lastSeenLocation": { "id": 12 }
  },
  "reassign": false,
  "returnValue": false
}
```

The **Reassign** and **Return value** toggles at the top of the page control those two flags for all rows.

## Workflow

1. **Select source environment** (optional) — if your file contains IDs from a different environment, choose it here and select the conversion tables to apply.
2. **Upload file** — drag-and-drop or click to browse.
3. **Preview payloads** — click the Preview button to inspect the exact JSON that will be sent for each row, including any conversion applied. Rows with conversion errors are highlighted in red.
4. **Send** — click **Import N rows**. A progress bar tracks completion. Only rows that fail are shown in the results table.

## Conversion tables

If the IDs in your file come from a source environment that is different from the active target environment, enable conversion:

1. Select the source environment ("IDs in my file come from …").
2. Check the conversion tables to apply.
3. The conversion is applied to each row before the payload is built.

Rows where a required ID has no mapping entry will fail according to the table's **fallback strategy** (error / use default / keep source value). See [Conversion Tables](conversion-tables.md).

## Performance

Requests are sent with 3 parallel workers. The results table only renders error rows to keep the UI fast on large files. A summary line shows the total success count.
