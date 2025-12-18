# Installation

### Using Go

You can install Polygon's `pol` command line interface using Go install command as follows:

```bash
env GOPROXY=direct GOPRIVATE=go.scnd.dev go install go.scnd.dev/open/polygon/command/pol@latest
```

### Development

You can set up development environment and compile `pol` from source as follows:

1. Clone the repository

   ```bash
   git clone https://github.com/oscnd/polygon && cd polygon
   ```

2. Download external dependencies
   ```bash
   bash ./scripts/external.sh
   go mod tidy
   ```
3. Build the `pol` command line interface
   ```bash
   go install ./polygon/command/pol
   ```

:::warning Installation verification
Make sure that your `$GOPATH/bin` is included in your system `PATH` variable to be able to run the `pol` command from anywhere.
:::
