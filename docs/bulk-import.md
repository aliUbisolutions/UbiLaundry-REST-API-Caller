# Bulk Assignment Import

The `/import` page sends one assignment API call per row of a CSV or Excel file.

## Supported file formats

- `.csv` (comma-separated, semicolon-separated, or tab-separated — detected automatically)
- `.xlsx` / `.xls` (Excel)

By default the first row is treated as a header row and each column header is used as a field name. If your file has no header row, uncheck **First row is header** and type the column names manually (see [Parse options](#parse-options) below).

### Large CSV files

CSV files are read in streaming batches of 50,000 rows using `Blob.slice()`, so files with hundreds of thousands of rows load without running out of browser memory. Use the **← →** batch navigation buttons to move between batches, or use the **Import all batches** / **SQL — all batches** buttons to process the entire file automatically.

## Parse options

These options appear above the file drop zone and can be changed at any time — the file is re-parsed automatically when they change.

| Option | Default | Description |
|---|---|---|
| **First row is header** | on | Treats the first row as column names. Turn off for files that start directly with data. |
| **Column names** | *(empty)* | Visible only when **First row is header** is off. Enter the field names in column order, comma-separated (e.g. `id, category, encodingDate`). The `id` field must be included. |

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

The **Reassign** and **Return value** toggles control those two flags for all rows.

## Workflow

1. **Set parse options** — choose whether the first row is a header; enter column names if not.
2. **Upload file** — drag-and-drop or click to browse.
3. **Import options** — toggle Reassign and Return value flags.
4. **SQL Export options** — configure table names if you want to download a SQL script instead of calling the API (see below).
5. **ID Conversion** (optional) — if your file contains IDs from a different environment, select the source environment and the conversion tables to apply.
6. **Preview payloads** — inspect the exact JSON that will be sent for each row, including any conversion applied. Rows with conversion errors are highlighted in red.
7. **Download SQL** or **Import** — see below.

After completion, only error rows are shown. Each error row is expandable to show the request payload and server response. A **Retry N failed** button re-sends only the failed rows without touching successful ones.

## Multi-batch files

When a file has more than 50,000 rows, two extra buttons appear alongside the single-batch actions:

| Button | Description |
|---|---|
| **Import all batches** | Sends every batch in sequence without manual navigation. Shows "Importing batch X…" with a **Stop** button. |
| **SQL — all batches** | Reads every batch and downloads a single combined `.sql` file. Shows "Reading batch X…" during generation. |

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

The script is split into 500-row `INSERT` batches. Rows with conversion errors are excluded automatically.

### Running the script

Open the file in pgAdmin's **Query Tool** (File → Open) and press **F5**.

## Performance

Requests are sent with 3 parallel workers. The results table only renders error rows to keep the UI fast on large files. A summary line shows the total success count.

For very large files, use **Import all batches** to process the whole file automatically, or navigate manually with the **← →** buttons and import one batch at a time. Each batch is independent — you can retry failed rows within a batch before moving to the next.
