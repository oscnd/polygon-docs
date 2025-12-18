# Configure Project

## Directory Structure

In the Go project's working directory (same directory as `go.mod` file), create a polygon project directory (e.g., `./polygon` or any name)

```
├── go.mod
├── go.sum
└── polygon
    ├── polygon.yml
    ├── interface.yml
    ├── sequel.yml
    └── …
```

## Configuration

The main configuration file is `polygon.yml`, use the following template to create one:

```yml
server: { { env.POLYGON_SERVER || "localhost:3001/pol" } }
dialect: postgres
initializers:
  config:
    args: []
  database:
    args: []
```

For other configuration files, refer to their respective documentation pages:
