#!/bin/sh
set -e

echo "Waiting for database..."
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
" 2>/dev/null; do
  sleep 1
done
echo "Database is up."

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node dist/server.js
