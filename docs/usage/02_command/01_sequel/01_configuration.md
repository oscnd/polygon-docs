# Configuration

## Overview

The `pol database sequel` command generates Go model and SQLC querier from migrations with `sequel.yml` configuration
featuring the following capabilities:

- Finalizes migration files from `sequel/{connection}/migration/` into single schema file
- Auto-generates `sequel.yml` configuration with boilerplate field definitions
- Creates variants of Go models structs and database queriers extended from `sequel.yml` configuration

## Setup Schema

1. **Configure sqlc.yml**

   Initialize `sqlc.yml` in project root directory
   referenced [Sqlc Documentation](https://docs.sqlc.dev/en/stable/tutorials/getting-started-postgresql.html)

   ```yaml
   version: "2"
   sql:
     - engine: "postgresql"
       queries: "sequel/postgres/"
       gen:
         go:
           package: "psql"
           out: "generate/psql"
           overrides:
             - column: "users.metadata"
               go_type:
                 import: "backend/type/prop"
                 type: "UserMetadata"
                 pointer: true
   ```

   ::: tip

   Polygon follows sqlc overrides for JSONB fields mapping to custom struct instead of `any`.

   :::

2. **Create Migration Files**

   Create migration files in `sequel/{connection}/migration/`
   referenced [Goose Documentation](https://github.com/pressly/goose)

   ```
   sequel/
   ├── postgres/
   │   └── migration/
   │       ├── 001_create_users.sql
   │       └── 002_create_orders.sql
   ```

   ::: details Migration Example

   ```sql
   -- +goose Up
   -- +goose StatementBegin
   CREATE TABLE users
   (
       id         BIGSERIAL    PRIMARY KEY,
       name       VARCHAR(255) NOT NULL,
       metadata   JSONB        NOT NULL,
       created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   -- +goose StatementEnd

   -- +goose Down
   -- +goose StatementBegin
   DROP TABLE IF EXISTS users;
   -- +goose StatementEnd
   ```

   :::

3. **Generate Initial Configuration**

   Run sequel command to auto-generate `sequel.yml`:

   ```bash
   pol database sequel schema
   ```

   This creates initial configuration with all fields set to default.

## Configuration Structure

```yml
connections:
  postgres: # Connection name
    dialect: postgres
    tables:
      users:
        fields:
          - name: id
            include: base
          - name: name
            include: base
            feature:
              - sort
              - filter
          - name: metadata
            include: base
          - name: created_at
            include: base
        additions:
          - name: picture_url
            package: null
            type: string
          - name: settings
            package: example/type/prop
            type: UserSettings
        joins:
          - type: parented
            table: post_reactions
            fields:
              - profile_id
              - profile_id.user_id
              - post_id
              - post_id.profile_id
              - post_id.profile_id.user_id
```

### Connections

Connections define database connections with their dialects and table configurations.

::: details Configuration Example

```yml
connections:
  postgres: # Connection name
    dialect: postgres
    tables: …
  external_db:
    dialect: mysql
    tables: …
```

:::

### Tables

Tables define individual database tables in each connection with their field, addition, and join configurations.

::: details Configuration Example

```yml
tables:
  users:
    fields: …
    additions: …
    joins: …
  orders:
    fields: …
    additions: …
    joins: …
```

:::

- **fields**

  Fields control which database columns are included in generated models and how they're handled.
  ::: details Configuration Example

  ```yaml
  fields:
    - name: id
      include: base
    - name: name
      include: base
      feature:
        - sort
        - filter
    - name: metadata
      include: base
    - name: created_at
      include: base
    - name: password_hash
      include: none
  ```

  :::
  - **name** is a name of a database column
  - **include** controls inclusion in generated models
    - `base` (default): included in base model
    - `none`: excluded from models (e.g., sensitive data)
  - **feature** is an array of additional processing features (e.g., `sort`, `filter`) which adds to generated
    queriers (see [Query Features](./03_query_features.md) for details)

- **additions**

  Add additional virtual fields that don't exist in the database schema to the models.

  ::: details Configuration Example

  ```yaml
  additions:
    - name: picture_url
      package: null
      type: string
    - name: settings
      package: example/type/prop
      type: UserSettings
  ```

  :::

- **joins**

  Complex relationship definitions for adding `With` queriers that automatically use joined tables for load results.

  ::: details Configuration Example

  ```yaml
  joins:
    - type: parented
      table: post_reactions
      fields:
        - profile_id
        - profile_id.user_id
        - post_id
        - post_id.profile_id
        - post_id.profile_id.user_id
  ```

  :::

## Generated Output

Running `pol database sequel schema` generates the following files and directories:

```
.
├── polygon
│   └── sequel.yml                      # Polygon's sequel configuration
└── generate/
    ├── polygon/                        # Generated output directory
    │   ├── model/                      # Go models outout
    │   │   ├── postgres.user.go
    │   │   ├── postgres.post.go
    │   │   └── …
    │   └── sequel/                     # SQL output
    │       ├── postgres.sql            # Consolidated schema file
    │       └── postgres/               # Querier files
    │           ├── users.sql
    │           ├── posts.sql
    │           └── …
    └── psql/                           # SQLC-generated code
        ├── models.go                   # SQLC base models
        ├── querier.go                  # Query interfaces
        ├── db.go                       # Database connection
        └── *.sql.go                    # Generated query functions
```

### Schema Summary

For each connection with migration files declared, polygon will generate consolidated database schema from all migration files at `generate/polygon/sequel/{connection}.sql`

::: details Original Migration Files
**001_create_users.sql**

```sql
-- +goose Up
-- +goose StatementBegin
CREATE TABLE users
(
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- +goose StatementEnd
…
```

**002_add_metadata_to_users.sql**

```sql
-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
    ALTER password_hash TYPE VARCHAR(255),
ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}';
-- +goose StatementEnd
…
```

:::

```sql
-- POLYGON GENERATED
-- database schema: postgres
-- dialect: postgres

CREATE TABLE users (
    id BIGSERIAL NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL,
    PRIMARY KEY (id)
);
…
```

### Model Variants

Each table generates multiple Go model structs based on field inclusion and additions configuration at `generate/polygon/model/{connection}.{table}.go`.
Each struct serves different use-cases:

| Variant        | Suffix        | Description                                      |
| -------------- | ------------- | ------------------------------------------------ |
| Base Model     | (none)        | Core database fields with base inclusion         |
| Addition Model | `Addition`    | Virtual fields from additions configuration      |
| Contraction    | `Contraction` | Base model minus excluded (include: none) fields |
| Added Model    | `Added`       | Base model plus additions                        |
| Joined Model   | `Joined`      | Added model with all child relationships         |
| Parented Model | `Parented`    | Added model with parent relationships            |

```go
package model

import (
    "time"
    "example/type/prop"
)

// base model: database fields with base inclusion
type User struct {
    Id *uint64 `json:"id" validate:"required"`
    Oid *string `json:"oid" validate:"required"`
    Username *string `json:"username" validate:"required"`
    Email *string `json:"email" validate:"required"`
    IsActive *bool `json:"isActive" validate:"required"`
    Metadata *prop.UserMetadata `json:"metadata" validate:"required"`
    CreatedAt *time.Time `json:"createdAt" validate:"required"`
    UpdatedAt *time.Time `json:"updatedAt" validate:"required"`
}

// addition model: fields from additions configuration
type UserAddition struct {
    PictureUrl *string `json:"pictureUrl"`
    Settings *prop.UserSettings `json:"settings"`
}

// contraction model: base model minus excluded (include: none) fields
type UserContraction struct {
    PasswordHash *string `json:"passwordHash"`
    TotpSecret *string `json:"totpSecret"`
}

// added model: base model plus additions
type UserAdded struct {
    Id *uint64 `json:"id" validate:"required"`
    Oid *string `json:"oid" validate:"required"`
    Username *string `json:"username" validate:"required"`
    Email *string `json:"email" validate:"required"`
    IsActive *bool `json:"isActive" validate:"required"`
    Metadata *prop.UserMetadata `json:"metadata" validate:"required"`
    CreatedAt *time.Time `json:"createdAt" validate:"required"`
    UpdatedAt *time.Time `json:"updatedAt" validate:"required"`
    PictureUrl *string `json:"pictureUrl"`
    Settings *prop.UserSettings `json:"settings"`
}

// joined model: added model with all child relationships
type UserJoined struct {
    Id *uint64 `json:"id" validate:"required"`
    // … all UserAdded fields
    Profiles []*Profile `json:"profiles"`  // Child relationships
}

// parented model: added model with parent relationships
type UserParented struct {
    Id *uint64 `json:"id" validate:"required"`
    // … all UserAdded fields
    Organization *Organization `json:"organization"`  // Parent relationships
}
```

### SQL Queries

For each table, polygon generates SQLC querier files at `generate/polygon/sequel/{connection}/{table}.sql` with standard queries:

| Variant      | Suffix        | Description                                |
|--------------|---------------|--------------------------------------------|
| Count        | `Count`       | Count total records                        |
| Create       | `Create`      | Insert new record                          |
| Update       | `Update`      | Update existing record                     |
| One          | `One`         | Fetch single record by primary key         |
| One Counted  | `OneCounted`  | Fetch single record with related counts    |
| One With     | `OneWith…`    | Fetch single record with related joins     |
| Many         | `Many`        | Fetch multiple records by primary keys     |
| Many Counted | `ManyCounted` | Fetch multiple records with related counts |
| Many With    | `ManyWith…`   | Fetch multiple records with related joins  |
| List         | `List`        | Paginated list of records                  |
| List With    | `ListWith…`   | Paginated list with related joins          |
| Delete       | `Delete`      | Delete record by primary key               |

```sql
-- POLYGON GENERATED
-- table: user

-- name: UserCount :one
SELECT COALESCE(COUNT(*), 0)::BIGINT AS user_count
FROM users;

-- name: UserCreate :one
INSERT INTO users (oid, username, email, password_hash, totp_secret, is_active, metadata)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UserUpdate :one
UPDATE users
SET oid = COALESCE(sqlc.narg('oid'), oid),
    username = COALESCE(sqlc.narg('username'), username),
    email = COALESCE(sqlc.narg('email'), email),
    password_hash = COALESCE(sqlc.narg('password_hash'), password_hash),
    totp_secret = COALESCE(sqlc.narg('totp_secret'), totp_secret),
    is_active = COALESCE(sqlc.narg('is_active'), is_active),
    metadata = COALESCE(sqlc.narg('metadata'), metadata)
WHERE users.id = sqlc.narg('id')::BIGINT
RETURNING *;

-- name: UserOne :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: UserOneCounted :one
SELECT sqlc.embed(users),
       (SELECT COALESCE(COUNT(*), 0)::BIGINT FROM profiles WHERE profiles.user_id = users.id) AS profile_count
FROM users
WHERE users.id = $1
LIMIT 1;

-- name: UserMany :many
SELECT * FROM users WHERE id = ANY(sqlc.narg('ids')::BIGINT[]);

-- name: UserManyCounted :many
SELECT sqlc.embed(users),
       (SELECT COALESCE(COUNT(*), 0)::BIGINT FROM profiles WHERE profiles.user_id = users.id) AS profile_count
FROM users
WHERE id = ANY(sqlc.narg('ids')::BIGINT[]);

-- name: UserList :many
SELECT sqlc.embed(users)
FROM users
LIMIT sqlc.narg('limit')::BIGINT
OFFSET COALESCE(sqlc.narg('offset')::BIGINT, 0);

-- name: UserDelete :one
DELETE FROM users WHERE id = $1 RETURNING *;
```

::: tip Auto-generated Configuration

If `sequel.yml` doesn't exist, the command automatically generates it with all tables and fields discovered from migrations. All fields default to `include: base`.

After generation, customize `sequel.yml` to:

- Exclude sensitive fields (`include: none`)
- Add virtual fields (`additions`)
- Configure query features (`feature: [sort, filter, increase]`)
- Define relationships (`joins`)

:::
