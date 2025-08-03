Create a docker compose that runs redis.
Create a UI app that will have react UI and few backend node apis.

The backend component will periodically insert data into a redis queue.

The object that will be stored in the queue will have following attributes:

object_id uuid
created datetime
updated datetime
status text
metadata text
records int
outcome text

We will have a backend schedule that inserts a record into this queue every minute randomly.

records should be between 1 and 10
status can be one of the following:
    RECEIVED,
    VALIDATING,
    INVALID,
    ENRICHING,
    PROCESSING,
    COMPLETE,
    
INVALID and COMPLETE are terminal states and hence outcome will be success or failure if the status is one of these.


In the UI, we need a single page app that displays these records in modern table format.

We need a nice look and feel theme and use teal for it. All UI elements must look modern and clean.


This has to be done after everything else is done.
At a later point, as record is added into redis queue, we want to show it in the UI without requiring refresh (like SSE stream).


Guidelines:
- create a dev.sh file that starts the app by stopping/killing existing app process.
- create unit test for the code being generated and must have 80% coverage at least.
- changes must be validated using Playwright MCP by invoking the browser (not playwright tests but MCP).
