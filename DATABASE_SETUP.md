# Production-Ready PostgreSQL Setup

This guide covers setting up a production-ready local PostgreSQL database for the RACI SaaS Platform.

## Prerequisites

- PostgreSQL 15+ installed locally
- Node.js 20+ with npm/pnpm
- Database client (optional): Prisma Studio, pgAdmin, or DBeaver

## Installation

### macOS (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Verify installation
psql --version
```

### Linux (Ubuntu/Debian)

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install PostgreSQL
sudo apt update
sudo apt install postgresql-16

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows

Download and install from: https://www.postgresql.org/download/windows/

## Database Setup

### 1. Create Database User

```bash
# Connect to PostgreSQL as superuser
psql postgres

# Create dedicated user with strong password
CREATE USER raci_admin WITH PASSWORD 'your_strong_password_here';

# Grant necessary privileges
ALTER USER raci_admin WITH CREATEDB;
ALTER USER raci_admin WITH CREATEROLE;

# Exit
\q
```

### 2. Create Database

```bash
# Create database owned by raci_admin
createdb -U raci_admin raci_saas

# Or via psql:
psql -U postgres -c "CREATE DATABASE raci_saas OWNER raci_admin;"
```

### 3. Configure Connection Pooling (Production)

For production deployments, use PgBouncer for connection pooling:

```bash
# Install PgBouncer (macOS)
brew install pgbouncer

# Configure pgbouncer.ini
[databases]
raci_saas = host=localhost port=5432 dbname=raci_saas

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /usr/local/etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
```

### 4. Configure Environment Variables

Update `.env` with your database credentials:

```bash
# Development (Direct Connection)
DATABASE_URL="postgresql://raci_admin:your_password@localhost:5432/raci_saas"
DIRECT_URL="postgresql://raci_admin:your_password@localhost:5432/raci_saas"

# Production (With PgBouncer)
DATABASE_URL="postgresql://raci_admin:your_password@localhost:6432/raci_saas?pgbouncer=true"
DIRECT_URL="postgresql://raci_admin:your_password@localhost:5432/raci_saas"
```

**Important**:
- `DATABASE_URL` is used by Prisma Client for queries (can use pooling)
- `DIRECT_URL` is used for migrations (must be direct connection)

### 5. Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or create migration (for production)
npm run db:migrate
```

### 6. Seed Database

```bash
# Seed with demo data (3 orgs, 50 members, 5 matrices)
npm run db:seed
```

## Database Management

### Backup Database

```bash
# Full backup
pg_dump -U raci_admin -Fc raci_saas > backups/raci_saas_$(date +%Y%m%d_%H%M%S).dump

# SQL backup
pg_dump -U raci_admin raci_saas > backups/raci_saas_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# From custom format dump
pg_restore -U raci_admin -d raci_saas -c backups/raci_saas_20241217_120000.dump

# From SQL dump
psql -U raci_admin -d raci_saas < backups/raci_saas_20241217_120000.sql
```

### Reset Database

```bash
# Drop and recreate database
dropdb -U raci_admin raci_saas
createdb -U raci_admin raci_saas

# Push schema and seed
npm run db:push
npm run db:seed
```

### View Database

```bash
# Open Prisma Studio (GUI)
npm run db:studio

# Or connect via psql
psql -U raci_admin -d raci_saas
```

## Performance Optimization

### 1. Enable Query Logging (Development)

Edit `postgresql.conf`:

```conf
log_statement = 'all'
log_duration = on
log_min_duration_statement = 100  # Log queries >100ms
```

### 2. Add Indexes

The Prisma schema includes optimized indexes for common queries:

```prisma
// Organization access
@@index([organizationId])

// Project lookups
@@index([projectId])

// Matrix operations
@@index([matrixId])

// Member workload queries
@@index([memberId])

// Composite indexes for joins
@@index([matrixId, memberId])
@@index([matrixId, taskId])
```

### 3. Connection Pool Settings

Recommended Prisma connection pool settings for production:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/raci_saas?connection_limit=20&pool_timeout=30&connect_timeout=10"
```

### 4. Analyze Query Performance

```sql
-- Enable timing
\timing on

-- Explain analyze a query
EXPLAIN ANALYZE
SELECT * FROM "Matrix"
WHERE "organizationId" = 'your-org-id'
AND "projectId" = 'your-project-id';

-- View slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Production Checklist

- [ ] PostgreSQL 15+ installed and running
- [ ] Dedicated database user created with strong password
- [ ] Database created with proper ownership
- [ ] Environment variables configured
- [ ] Migrations run successfully
- [ ] Database seeded with test data (development only)
- [ ] Connection pooling configured (PgBouncer)
- [ ] Automated backups scheduled
- [ ] SSL/TLS encryption enabled (production)
- [ ] Monitoring and alerting configured
- [ ] Database credentials stored securely (never commit .env)

## Security Best Practices

1. **Never commit `.env`** - Always use `.env.example` as template
2. **Use strong passwords** - Minimum 32 characters for production
3. **Enable SSL** - Use `?sslmode=require` in connection string for production
4. **Rotate credentials** - Change database passwords regularly
5. **Limit access** - Use firewall rules to restrict database access
6. **Audit logging** - The platform includes built-in audit logging (AuditLog model)
7. **Encryption at rest** - Enable PostgreSQL transparent data encryption
8. **Regular backups** - Automate daily backups with retention policy

## Troubleshooting

### Connection Refused

```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Restart service
brew services restart postgresql@16
```

### Permission Denied

```bash
# Grant all privileges to user
psql postgres
GRANT ALL PRIVILEGES ON DATABASE raci_saas TO raci_admin;
\q
```

### Migration Failed

```bash
# Reset database and try again
npx prisma migrate reset

# Or manually:
dropdb -U raci_admin raci_saas
createdb -U raci_admin raci_saas
npm run db:push
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npm run db:generate

# Clear node_modules if issues persist
rm -rf node_modules
npm install
```

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PgBouncer Documentation](https://www.pgbouncer.org/usage.html)
- [Database Security Checklist](https://www.postgresql.org/docs/current/security.html)
