#!/bin/sh
# One role and one database per service, each role owning its database and
# nothing else, so a bug in one service cannot read or change another's data.
#
# Postgres runs this once, on an empty data directory. It is still written to
# be safe to run again by hand. The passwords equal the role names: the stack
# is local only, and Postgres is published on the loopback interface alone.
set -eu

for service in commerce cms gateway; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${service}') THEN
    CREATE ROLE ${service} LOGIN PASSWORD '${service}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${service} OWNER ${service}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${service}')\gexec
-- Every role may connect to every database by default: only the owner may here.
REVOKE ALL ON DATABASE ${service} FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE ${service} TO ${service};
SQL
done
