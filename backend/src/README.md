## Backend Architecture

The backend now follows a thin route pattern for game flows:

- `routes/` handles HTTP concerns such as request parsing, auth middleware, and response codes.
- `services/` holds business operations such as creating games, processing turns, and match progression.
- `repositories/` owns SQL queries and record updates.
- `logic/` contains pure darts rules and scoring helpers.

When adding new game behavior, prefer this flow:

1. Parse and validate request input in the route.
2. Delegate the operation to a service function.
3. Keep SQL in a repository helper instead of embedding queries in the route or service.
4. Return a single response shape from the route.

This keeps the game rules testable and makes large handlers easier to extend without growing into another all-in-one file.
