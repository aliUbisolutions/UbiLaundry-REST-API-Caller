# Bulk Assignment Import

The `/import` page sends one assignment API call per row of a CSV or Excel file.

## Supported file formats

- `.csv` (comma-separated, semicolon-separated, or tab-separated — detected automatically)
- `.xlsx` / `.xls` (Excel)

The first row must be a header row. Each column header is used as a field name.

### Large CSV files

CSV files are read in streaming batches of 50,000 rows using `Blob.slice()`, so files with hundreds of thousands of rows load without running out of browser memory. Use the **← →** batch navigation buttons to move between batches and import each one in turn.

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

1. **Upload file** — drag-and-drop or click to browse.
2. **Import options** — toggle Reassign and Return value flags.
3. **SQL Export options** — configure table names if you want to download a SQL script instead of calling the API (see below).
4. **ID Conversion** (optional) — if your file contains IDs from a different environment, select the source environment and the conversion tables to apply.
5. **Preview payloads** — inspect the exact JSON that will be sent for each row, including any conversion applied. Rows with conversion errors are highlighted in red.
6. **Download SQL** or **Import N items** — see below.

After completion, only error rows are shown. Each error row is expandable to show the request payload and server response. A **Retry N failed** button re-sends only the failed rows without touching successful ones.

## Conversion tables

If the IDs in your file come from a source environment that is different from the active target environment, enable conversion:

1. Select the source environment ("IDs in my file come from …").
2. Check the conversion tables to apply.
3. The conversion is applied to each row before the payload is built.

Rows where a required ID has no mapping entry will fail according to the table's **fallback strategy** (error / use default / keep source value). See [Conversion Tables](conversion-tables.md).

## SQL Export

Instead of calling the API, you can download a ready-to-run PostgreSQL `.sql` file. This is faster for large files.

### Options

| Option | Default | Description |
|---|---|---|
| **Main table** | `item` | The parent table that receives all columns |
| **Subclass table** | `item_laundry` | A joined-inheritance subclass table that receives only `id` |
| **ON CONFLICT DO UPDATE** | on | Generates upsert statements — safe to re-run |

### Column mapping

| CSV column | DB column |
|---|---|
| `id` | `id` (always quoted as string) |
| `encodingDate` | `encodingdate` |
| `firstSeenDate` | `firstseendate` |
| `lastSeenDate` | `lastseendate` |
| `washingCycleSeed` | `washingcycleseed` |
| `category` | `category_id` |
| `lastMovementType` | `lastmovementtypeid` |
| `lastReportLocation` | `lastreportlocationid` |
| `lastSeenLocation` | `lastseenlocationid` |
| `lastSeenWorkstation` | `lastseenworkstationid` |
| *(hardcoded)* | `hs = false`, `killed = false`, `reformed = false` |

The script is split into 500-row `INSERT` batches. Rows with conversion errors and trailing empty Excel rows are excluded automatically.

### Running the script

Open the file in pgAdmin's **Query Tool** (File → Open) and press **F5**.

## Performance

Requests are sent with 3 parallel workers. The results table only renders error rows to keep the UI fast on large files. A summary line shows the total success count.

For very large files, import one batch at a time using the batch navigation buttons. Each batch is independent — you can retry failed rows within a batch before moving to the next.
