To verify the SQL comment injection:

Enable query logging on your Postgres server (e.g., `log_statement = 'all'`).

Or add simple client log middleware to print SQL before `exec.`

If you want to integrate with real `OpenTelemetry` or `SQLCommenter` context, you can replace the dummy tags object with actual metadata from your tracing context.
