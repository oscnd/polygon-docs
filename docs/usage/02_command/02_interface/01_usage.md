# Interface Generation

## Overview

The `pol interface` command generates Go interfaces from existing receiver methods based on configuration in `interface.yml`. This system automatically extracts method signatures from Go files and creates typed interfaces with dependency injection capabilities.

## Usage

Use this command to generate interfaces:

```bash
pol interface
```

The command scans specified directories for Go files containing receiver methods, extracts their signatures, and generates:

- `interface.go` - Interface definitions
- `bind.go` - Dependency injection binder with getters/setters

## Configuration Structure

Create `interface.yml` in your project root:

```yml
scans:
  - scan_dir: procedure
    scan_receiver_type: "*Procedure"
    generate_interface_name: "{{ structName }}Procedure"
    recursive: true

  - scan_dir: service
    scan_receiver_type: "*Service"
    generate_interface_name: "{{ structName }}Service"
    recursive: true
```

### Scan Configuration

Each scan configuration defines how to extract interfaces from Go source files:

| Field                     | Description                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `scan_dir`                | Directory to scan for Go files                                                     |
| `scan_receiver_type`      | Receiver type to match (e.g., `*Service`)                                          |
| `generate_interface_name` | Template for interface name with <span v-pre>`{{ structName }}`</span> placeholder |
| `recursive` (boolean)     | Whether to scan subdirectories recursively                                         |

::: details Interface Name Template

The `generate_interface_name` field supports template substitution of <span v-pre>`{{ structName }}`</span> placeholder
which replaced with the PascalCase version of the directory name containing the Go files.

| Example Template            | Resulting Interface Name |
| --------------------------- | ------------------------ |
| `{{ structName }}Procedure` | `UserProcedure`          |
| `{{ structName }}Service`   | `UserService`            |
| `I{{ structName }}`         | `IUser`                  |

:::

## Generated Output

Running `pol interface` generates the following files in `generate/polygon/index/`:

```
generate/polygon/index/
├── interface.go    # Generated interface definitions
└── bind.go         # Dependency injection binder
```

### Interface Definitions

The system automatically extracts receiver methods and generates typed interfaces:

::: code-group

```yml [Configuration]
scans:
  - scan_dir: procedure
    scan_receiver_type: "*Procedure"
    generate_interface_name: "{{ structName }}Procedure"
    recursive: true
```

```go [Generated Interface]
package index

import (
    "backend/generate/polygon/model"
    "backend/type/prop"
    "context"
    "github.com/bsthun/gut"
)

// UserProcedure interface defines methods for UserProcedure
type UserProcedure interface {
    UserCreate(ctx context.Context, name *string, metadata *prop.UserMetadata) (*model.User, *gut.ErrorInstance)
    UserDelete(ctx context.Context, id *uint64) (*model.User, *gut.ErrorInstance)
    UserGet(ctx context.Context, id *uint64) (*model.User, *gut.ErrorInstance)
    UserList(ctx context.Context, name *string, limit *uint64, offset *uint64) ([]*model.User, *uint64, *gut.ErrorInstance)
    UserUpdate(ctx context.Context, id *uint64, name *string, metadata *prop.UserMetadata) (*model.User, *gut.ErrorInstance)
}
```

```go [Source Example]
// procedure/user_proc.go
package procedure

type Procedure struct {
    database Database
}

func (r *Procedure) UserCreate(ctx context.Context, name *string, metadata *prop.UserMetadata) (*model.User, *gut.ErrorInstance) {
    // implementation
}

func (r *Procedure) UserGet(ctx context.Context, id *uint64) (*model.User, *gut.ErrorInstance) {
    // implementation
}
```

:::

### Interface Binder

The generated `bind.go` provides a binder struct with methods to inject and retrieve implementations:

```go
package index

type Binder struct {
    userProcedure UserProcedure
    wishProcedure WishProcedure
    wishImageProcedure WishImageProcedure
}

func (r *Binder) BindUserProcedure(impl UserProcedure) {
    r.userProcedure = impl
}

func (r *Binder) GetUserProcedure() UserProcedure {
    return r.userProcedure
}

func (r *Binder) BindWishProcedure(impl WishProcedure) {
    r.wishProcedure = impl
}

func (r *Binder) GetWishProcedure() WishProcedure {
    return r.wishProcedure
}

func Bind() *Binder {
    return new(Binder)
}
```

## Usage Examples

### Setting Up Dependencies

```go
package main

import (
    "backend/generate/polygon/index"
    "backend/procedure"
    "backend/service"
)

func main() {
    // * constuct binder
    binder := index.Bind()

    // * create implementations
    config := config.Init(binder)
    database := database.Init(binder, config)
    userProcedure := procedure.NewUserProcedure(binder, database)

    // * use in handlers
    handler := NewHandler(binder)
}
```

### Using in Handlers

```go
package handler

type Handler struct {
    binder *index.Binder
}

func NewHandler(binder *index.Binder) *Handler {
    return &Handler{ binder: binder }
}

func (h *Handler) HandleUserCreate(c *fiber.Ctx) error {
    // * get procedure from binder
    userProc := h.binder.GetUserProcedure()

    // * call method
    user, er := userProc.UserCreate(c.Context(), body.Name, body.Metadata)
    if er != nil {
        return er
    }

    return c.JSON(response.Success(c, &payload.UserCreateResponse{
        User: user,
    }))
}
```

## Best Practices

### 1. Organize by Package Structure

Arrange your code with clear package directories:

```
project/
├── procedure/
│   ├── user_proc.go      # UserProcedure methods
│   ├── post_proc.go      # PostProcedure methods
│   └── profile_proc.go   # ProfileProcedure methods
├── service/
│   ├── user_svc.go       # UserService methods
│   └── auth_svc.go       # AuthService methods
└── interface.yml         # Configuration
```

### 2. Use Consistent Receiver Names

```go
// Good: consistent receiver naming
func (r *Procedure) UserCreate(...) { ... }
func (r *Procedure) UserUpdate(...) { ... }

// Good: consistent per type
func (p *Procedure) UserCreate(...) { ... }
func (s *Service) UserValidate(...) { ... }
```

### 3. Keep Interface Focused

Generate interfaces for cohesive groups of methods:

```yml
# Good: focused interfaces
scans:
  - scan_dir: procedure
    scan_receiver_type: "*Procedure"
    generate_interface_name: "{{ structName }}Procedure"
    recursive: true

# Avoid: mixing different concerns
scans:
  - scan_dir: .
    scan_receiver_type: "*Handler"
    generate_interface_name: "{{ structName }}Interface"  # Too generic
    recursive: true
```

::: tip

The interface generator is designed to be conservative - it only generates interfaces for methods it can safely parse and understand. If a method has complex syntax or unsupported features, it will be skipped rather than generating incorrect code.

:::
