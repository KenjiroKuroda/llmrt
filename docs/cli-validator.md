---
sidebar_position: 5
---

# LGF Validator CLI Tool

The LGF Validator CLI tool provides command-line validation for LLM Game Format (LGF) cartridge files. It supports batch validation, detailed error reporting, and integration with build tools and CI systems.

## Installation

The CLI tool is included with the LLM Canvas Engine package:

```bash
npm install llm-canvas-engine
```

Or install globally for system-wide access:

```bash
npm install -g llm-canvas-engine
```

## Usage

### Basic Usage

```bash
# Validate a single file
lgf-validate game.lgf.json

# Validate all LGF files in a directory
lgf-validate games/

# Recursively validate all LGF files
lgf-validate -r src/
```

### Command Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--recursive` | `-r` | Recursively search directories for LGF files |
| `--verbose` | `-v` | Show detailed output including successful validations |
| `--json` | `-j` | Output results in JSON format |
| `--quiet` | `-q` | Suppress non-error output |
| `--pattern <glob>` | `-p` | Only validate files matching the pattern |
| `--exclude <glob>` | `-e` | Exclude files matching the pattern (can be used multiple times) |
| `--no-exit-code` | | Don't exit with error code on validation failures |
| `--help` | `-h` | Show help message |
| `--version` | | Show version number |

### Examples

#### Validate Specific Files
```bash
# Single file
lgf-validate pong.lgf.json

# Multiple files
lgf-validate pong.lgf.json tetris.lgf.json
```

#### Directory Validation
```bash
# All LGF files in current directory
lgf-validate .

# All LGF files in games directory
lgf-validate games/

# Recursive validation
lgf-validate -r src/
```

#### Pattern Matching
```bash
# Only validate files matching pattern
lgf-validate -p "*.lgf.json" -r .

# Exclude test files
lgf-validate -e "test*" -e "*-backup*" -r .

# Validate only game cartridges, exclude configs
lgf-validate -p "game-*.lgf.json" games/
```

#### Output Formats
```bash
# Verbose output with all details
lgf-validate -v games/

# JSON output for programmatic use
lgf-validate -j games/ > validation-report.json

# Quiet mode (only errors)
lgf-validate -q games/
```

#### CI/Build Integration
```bash
# Exit with error code on validation failures (default)
lgf-validate games/

# Don't exit with error code (for reporting only)
lgf-validate --no-exit-code games/

# Generate JSON report for build artifacts
lgf-validate -j -r . > build/validation-report.json
```

## Output Formats

### Standard Output

The default output format provides human-readable validation results:

```
LGF Validator - 2 valid, 1 invalid, 3 total

✓ games/pong.lgf.json
⚠ games/tetris.lgf.json
  Warning scenes[0]: Scene "gameScene" has no child nodes
    Suggestion: Consider adding some content to make the scene interactive

✗ games/broken.lgf.json
  Error version: Invalid version: 2.0
    Suggestion: Use version "1.0"
  Error metadata.title: Metadata title must be a non-empty string
    Suggestion: Provide a valid title string

Statistics:
  Files processed: 3
  Valid files: 2
  Invalid files: 1
  Total errors: 2
  Total warnings: 1
  Processing time: 45ms
  Success rate: 66.7%
```

### JSON Output

Use the `-j` flag for machine-readable JSON output:

```json
{
  "summary": {
    "totalFiles": 3,
    "validFiles": 2,
    "invalidFiles": 1,
    "totalErrors": 2,
    "totalWarnings": 1,
    "processingTime": 45,
    "successRate": 66.7
  },
  "files": [
    {
      "file": "games/pong.lgf.json",
      "valid": true,
      "errors": [],
      "warnings": []
    },
    {
      "file": "games/tetris.lgf.json",
      "valid": true,
      "errors": [],
      "warnings": [
        {
          "path": "scenes[0]",
          "message": "Scene \"gameScene\" has no child nodes",
          "suggestion": "Consider adding some content to make the scene interactive"
        }
      ]
    },
    {
      "file": "games/broken.lgf.json",
      "valid": false,
      "errors": [
        {
          "path": "version",
          "message": "Invalid version: 2.0",
          "suggestion": "Use version \"1.0\"",
          "code": "INVALID_VERSION"
        },
        {
          "path": "metadata.title",
          "message": "Metadata title must be a non-empty string",
          "suggestion": "Provide a valid title string",
          "code": "INVALID_METADATA_VALUE"
        }
      ],
      "warnings": []
    }
  ]
}
```

## Error Types and Codes

The validator provides detailed error codes for programmatic handling:

### Structural Errors
- `INVALID_ROOT_TYPE` - Cartridge is not a JSON object
- `MISSING_REQUIRED_PROPERTY` - Missing required root property
- `UNKNOWN_PROPERTY` - Unknown property in cartridge

### Version Errors
- `INVALID_VERSION` - Unsupported version number

### Metadata Errors
- `INVALID_METADATA_TYPE` - Metadata is not an object
- `MISSING_METADATA_FIELD` - Missing required metadata field
- `INVALID_METADATA_VALUE` - Invalid metadata field value

### Theme Errors
- `INVALID_THEME_TYPE` - Theme is not an object
- `INVALID_THEME_COLORS` - Colors object is invalid
- `MISSING_THEME_COLOR` - Missing required color
- `INVALID_COLOR_FORMAT` - Invalid color format
- `INVALID_THEME_FONT` - Font object is invalid
- `INVALID_THEME_PROPERTY` - Invalid theme property

### Scene Errors
- `INVALID_SCENES_TYPE` - Scenes is not an array
- `NO_SCENES` - No scenes defined
- `INVALID_SCENE_TYPE` - Scene is not an object
- `INVALID_SCENE_ID` - Invalid scene ID
- `DUPLICATE_SCENE_ID` - Duplicate scene ID
- `INVALID_ID_FORMAT` - Invalid ID format
- `MISSING_SCENE_ROOT` - Missing scene root node

### Node Errors
- `INVALID_NODE_TYPE` - Node is not an object
- `MISSING_NODE_PROPERTY` - Missing required node property
- `INVALID_NODE_ID` - Invalid node ID format
- `INVALID_NODE_TYPE_VALUE` - Invalid node type

### Transform Errors
- `INVALID_TRANSFORM_TYPE` - Transform is not an object
- `MISSING_TRANSFORM_PROPERTY` - Missing transform property
- `INVALID_ROTATION_TYPE` - Invalid rotation type
- `INVALID_ALPHA_VALUE` - Invalid alpha value
- `INVALID_VECTOR2_TYPE` - Vector2 is not an object
- `MISSING_VECTOR_PROPERTY` - Missing vector property
- `INVALID_VECTOR_VALUE` - Invalid vector value

### Action/Trigger Errors
- `INVALID_ACTION_TYPE` - Action is not an object
- `MISSING_ACTION_TYPE` - Missing action type
- `INVALID_ACTION_TYPE_VALUE` - Invalid action type
- `MISSING_ACTION_PARAMS` - Missing action params
- `INVALID_TRIGGER_TYPE` - Trigger is not an object
- `MISSING_TRIGGER_EVENT` - Missing trigger event
- `INVALID_TRIGGER_EVENT` - Invalid trigger event
- `MISSING_TRIGGER_ACTIONS` - Missing trigger actions

### Asset Errors
- `INVALID_ASSETS_TYPE` - Assets is not an object
- `MISSING_ASSET_TYPE` - Missing asset type
- `INVALID_ASSET_TYPE_FORMAT` - Invalid asset type format

### Variable Errors
- `INVALID_VARIABLES_TYPE` - Variables is not an object
- `INVALID_VARIABLE_TYPE` - Invalid variable type

### Parse Errors
- `JSON_PARSE_ERROR` - JSON syntax error
- `FILE_READ_ERROR` - File system error
- `VALIDATION_ERROR` - General validation error

## Integration Examples

### NPM Scripts

Add validation to your package.json scripts:

```json
{
  "scripts": {
    "validate": "lgf-validate games/",
    "validate:verbose": "lgf-validate -v -r .",
    "validate:ci": "lgf-validate -j games/ > validation-report.json",
    "test": "npm run validate && vitest"
  }
}
```

### GitHub Actions

```yaml
name: Validate LGF Cartridges
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run validate
      - name: Upload validation report
        if: always()
        run: lgf-validate -j games/ > validation-report.json
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: validation-report
          path: validation-report.json
```

### Makefile

```makefile
.PHONY: validate validate-verbose validate-ci

validate:
	lgf-validate games/

validate-verbose:
	lgf-validate -v -r .

validate-ci:
	lgf-validate -j games/ > build/validation-report.json

build: validate
	npm run build
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Validating LGF cartridges..."
if ! lgf-validate -q games/; then
    echo "LGF validation failed. Please fix errors before committing."
    exit 1
fi
```

## Exit Codes

- `0` - All files are valid
- `1` - One or more files are invalid or CLI error occurred

Use `--no-exit-code` to always exit with code 0, useful for reporting-only scenarios.

## Performance

The validator is optimized for batch processing:

- Processes files in parallel when possible
- Minimal memory usage for large file sets
- Fast JSON parsing and validation
- Efficient pattern matching for file filtering

Typical performance on modern hardware:
- ~100 files/second for average-sized cartridges
- ~1MB/second throughput for large files
- Memory usage scales linearly with file count

## Troubleshooting

### Common Issues

**No files found to validate**
- Check file extensions (should be `.json` with `.lgf.` in name)
- Verify directory paths
- Use `-v` flag to see which files are being processed

**Permission denied errors**
- Ensure read permissions on files and directories
- Check that directories exist and are accessible

**JSON parse errors**
- Validate JSON syntax with a JSON linter
- Check for trailing commas, comments, or other JSON syntax issues
- Ensure file encoding is UTF-8

**High memory usage**
- Process files in smaller batches
- Use pattern matching to exclude large non-LGF files
- Consider using `--quiet` mode for large batch operations

### Debug Mode

Use verbose mode for detailed debugging:

```bash
lgf-validate -v games/
```

This shows:
- File discovery process
- Validation progress
- Detailed error context
- Performance statistics
- Success/failure indicators for each file