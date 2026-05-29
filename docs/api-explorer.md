# API Explorer

The home page (`/`) lets you call any UbiLaundry endpoint interactively.

## Configuration

Before making any request, configure the connection in the top bar:

| Field | Description |
|---|---|
| **Base URL** | Root URL of the UbiLaundry server, e.g. `https://myserver.example.com` |
| **Username** | Basic-auth username |
| **Password** | Basic-auth password |

Settings are saved to `localStorage` automatically. To manage multiple servers, use the [Environments](environments.md) page and click **Activate** on the one you want to use.

## Making a request

1. Use the left sidebar to browse endpoint groups (Items, Assignments, Locations, …).
2. Click an endpoint to open it in the main panel.
3. Fill in any **path parameters** shown in the URL (e.g. `{id}`).
4. Edit the **request body** if the endpoint accepts one.
5. Click **Send**.

The response panel shows:
- HTTP status code and elapsed time
- Response body (pretty-printed JSON)

## Notes

- All requests go through the `/api/proxy` server route to avoid browser CORS restrictions. The credentials are never sent to the browser — the proxy forwards them server-side.
- The endpoint catalogue is defined in `src/lib/endpoints.ts`. To add a new endpoint, add an entry there and redeploy.
- An admin can restrict which endpoints a user is allowed to see and call. Hidden endpoints do not appear in the sidebar. Attempts to call a restricted endpoint directly are rejected by the proxy with HTTP 403.
