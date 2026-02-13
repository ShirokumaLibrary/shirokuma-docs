# Agent Skills: Examples and Patterns

## Table of Contents

1. [Complete Skill Examples](#complete-skill-examples)
2. [Description Examples](#description-examples)
3. [Common Workflow Patterns](#common-workflow-patterns)
4. [Supporting File Examples](#supporting-file-examples)
5. [Script Examples](#script-examples)
6. [Real-World Use Cases](#real-world-use-cases)

---

## Complete Skill Examples

### Example 1: PDF Processing Skill

**File: `.claude/skills/processing-pdfs/SKILL.md`**

```markdown
---
name: processing-pdfs
description: Extract text and tables from PDF files, fill forms, merge PDFs, and convert to other formats. Use when working with PDF files or when user asks to "read PDF", "extract PDF text", "fill PDF form", or "merge PDFs".
---

# PDF Processing Skill

Process PDF documents with text extraction, form filling, merging, and conversion capabilities.

## When to Use

Automatically invoke when the user:
- Asks to "read a PDF" or "extract PDF text"
- Wants to "fill a PDF form"
- Needs to "merge PDF files"
- Mentions "PDF conversion"
- Says "analyze PDF document"

## Workflow

### Step 1: Analyze PDF

```bash
python scripts/analyze_pdf.py input.pdf
```

Extracts:
- Number of pages
- Text content
- Form fields
- Images

### Step 2: Perform Operation

**Text Extraction**:
```bash
python scripts/extract_text.py input.pdf output.txt
```

**Form Filling**:
```bash
python scripts/fill_form.py input.pdf data.json output.pdf
```

**Merging**:
```bash
python scripts/merge_pdfs.py file1.pdf file2.pdf --output merged.pdf
```

### Step 3: Validate Output

Check that:
- Output file exists
- File size is reasonable
- Content is accessible

## Common Patterns

See [examples.md](examples.md) for:
- Form filling with JSON data
- Batch PDF processing
- PDF to text conversion
- Merging with bookmarks

## Error Handling

**File not found**:
```
ERROR: PDF file not found at path: [path]
Solution: Verify file path and permissions
```

**Corrupted PDF**:
```
ERROR: Unable to parse PDF (may be corrupted)
Solution: Try repairing with: python scripts/repair_pdf.py
```

**Password protected**:
```
ERROR: PDF is password protected
Solution: Provide password: --password "your-password"
```

## Notes

- Supports PDF 1.4 through 2.0
- Form filling requires XFA or AcroForm
- OCR available via --ocr flag
- Max file size: 100MB (configurable)

## Related Resources

- [reference.md](reference.md) - Complete API documentation
- [examples.md](examples.md) - Detailed examples
```

**Supporting file: `scripts/extract_text.py`**

```python
#!/usr/bin/env python3
"""Extract text from PDF file."""

import sys
import PyPDF2
from pathlib import Path

def extract_text(pdf_path, output_path):
    """Extract all text from PDF."""
    try:
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            
            if reader.is_encrypted:
                print("ERROR: PDF is password protected", file=sys.stderr)
                sys.exit(1)
            
            text_content = []
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                text_content.append(f"--- Page {page_num} ---\n{text}\n")
            
            output_path.write_text('\n'.join(text_content))
            print(f"✅ Extracted {len(reader.pages)} pages to {output_path}")
            
    except FileNotFoundError:
        print(f"ERROR: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: extract_text.py <input.pdf> <output.txt>")
        sys.exit(1)
    
    pdf_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    
    extract_text(pdf_path, output_path)
```

### Example 2: Data Validation Skill

**File: `.claude/skills/validating-data/SKILL.md`**

```markdown
---
name: validating-data
description: Validate structured data against schemas, check constraints, and generate validation reports. Use when user asks to "validate data", "check schema", "verify JSON", or "validate against rules".
allowed-tools: Read, Grep, Glob
---

# Data Validation Skill

Validate structured data (JSON, YAML, CSV) against schemas and custom rules.

## When to Use

Automatically invoke when the user:
- Asks to "validate data" or "check schema"
- Wants to "verify JSON structure"
- Needs to "validate CSV format"
- Mentions "data quality check"
- Says "check against schema"

## Workflow

### Step 1: Load Schema

```bash
cat schema.json
```

Review schema structure and requirements.

### Step 2: Load Data

```bash
cat data.json
```

### Step 3: Validate

```bash
python scripts/validate.py data.json --schema schema.json
```

Output shows:
- ✅ Valid fields
- ❌ Invalid fields with reasons
- ⚠️ Warnings for optional issues

### Step 4: Generate Report

```bash
python scripts/validate.py data.json --schema schema.json --report report.html
```

## Validation Types

**Schema Validation**:
- Required fields
- Data types
- Format patterns
- Enum values

**Constraint Validation**:
- Min/max values
- String length
- Array size
- Custom rules

**Cross-Field Validation**:
- Dependent fields
- Conditional requirements
- Referential integrity

## Error Handling

Script exits with:
- `0`: All validations passed
- `1`: Validation errors found
- `2`: Schema or data file not found
- `3`: Invalid schema format

## Notes

- Supports JSON Schema Draft 7
- YAML converted to JSON automatically
- CSV validation via custom rules
- Generates human-readable reports

## Related Resources

- [reference.md](reference.md) - Schema format details
- [examples.md](examples.md) - Validation examples
```

### Example 3: Generating Reports Skill

**File: `.claude/skills/generating-reports/SKILL.md`**

```markdown
---
name: generating-reports
description: Generate formatted reports from data in PDF, HTML, Markdown, or Excel formats. Use when user asks to "generate report", "create document", "export to PDF", or "make report".
---

# Report Generation Skill

Generate formatted reports from structured data with multiple output formats.

## When to Use

Automatically invoke when the user:
- Asks to "generate a report"
- Wants to "create documentation"
- Needs to "export to PDF" or "create Excel file"
- Mentions "formatted output"
- Says "make a report from this data"

## Workflow

### Step 1: Prepare Data

Ensure data is in supported format:
- JSON (structured data)
- CSV (tabular data)
- YAML (configuration-style data)

### Step 2: Choose Template

Available templates:
- `executive-summary`: High-level overview
- `detailed-analysis`: In-depth report
- `comparison`: Side-by-side comparison
- `dashboard`: Visual metrics

### Step 3: Generate Report

```bash
python scripts/generate_report.py \
  --data data.json \
  --template executive-summary \
  --output report.pdf
```

### Step 4: Validate Output

Check that:
- File generated successfully
- Content matches expectations
- Formatting is correct

## Output Formats

**PDF** (via ReportLab):
```bash
--output report.pdf
```

**HTML** (responsive):
```bash
--output report.html
```

**Markdown**:
```bash
--output report.md
```

**Excel** (with charts):
```bash
--output report.xlsx --charts
```

## Customization

**Custom styling**:
```bash
--style custom-style.css
```

**Logo and branding**:
```bash
--logo company-logo.png --brand
```

**Page layout**:
```bash
--layout landscape --margins "1in"
```

## Notes

- PDF generation requires: reportlab, pillow
- Excel generation requires: openpyxl, xlsxwriter
- HTML templates customizable in templates/
- Max data size: 10MB (configurable)

## Related Resources

- [templates/](templates/) - Available templates
- [examples.md](examples.md) - Report examples
```

---

## Description Examples

### Good Descriptions (Scored)

**Score: 10/10** (Excellent):
```yaml
description: Extract text and tables from PDF files, fill PDF forms with data, merge multiple PDFs, and convert PDFs to text or images. Use when working with PDF files or when user asks to "read PDF", "extract PDF text", "fill PDF form", "merge PDFs", or "convert PDF".
```

**Why excellent**:
- Multiple clear capabilities listed
- Specific file type (PDF)
- Five specific trigger phrases in quotes
- Third person voice
- Concrete actions (extract, fill, merge, convert)

**Score: 8/10** (Good):
```yaml
description: Analyze Excel spreadsheets to generate pivot tables, charts, and statistical summaries. Use when user asks to "analyze Excel file", "create pivot table", or "process spreadsheet data".
```

**Why good**:
- Clear capabilities
- Specific file type (Excel)
- Three trigger phrases
- Minor: Could mention .xlsx extension

**Score: 6/10** (Adequate):
```yaml
description: Process JSON data with validation and transformation. Use when working with JSON files.
```

**Why adequate**:
- Basic capability statement
- File type mentioned
- Missing: Specific trigger phrases in quotes
- Missing: Detailed capabilities

**Score: 3/10** (Poor):
```yaml
description: Helps with data processing and file operations.
```

**Why poor**:
- Vague ("helps with")
- No specific file types
- No trigger phrases
- No concrete capabilities

### Bad Descriptions (What Not to Do)

❌ **Too vague**:
```yaml
description: Utility for handling documents
```

❌ **First person**:
```yaml
description: I can help you analyze spreadsheets and create reports
```

❌ **No triggers**:
```yaml
description: Processes various file formats and performs data operations
```

❌ **Too long** (exceeds 1024 chars):
```yaml
description: This skill is designed to provide comprehensive data processing capabilities including but not limited to parsing various file formats such as JSON, XML, CSV, and Excel spreadsheets, performing complex data transformations and aggregations, generating detailed reports in multiple output formats, validating data against predefined schemas, handling error conditions gracefully, supporting batch processing operations, integrating with external APIs and services, providing extensive logging and debugging capabilities...
```

---

## Common Workflow Patterns

### Pattern 1: Read-Analyze-Report

```markdown
## Workflow

### Step 1: Read Input
```bash
cat input-file
```

### Step 2: Analyze
Run analysis:
```bash
python scripts/analyze.py input-file
```

### Step 3: Generate Report
```bash
python scripts/report.py --format html
```
```

### Pattern 2: Validate-Fix-Validate Loop

```markdown
## Workflow

Repeat until valid (max 3 attempts):

### Step 1: Validate
```bash
python scripts/validate.py data.json
```

### Step 2: If Errors Found
- Analyze error messages
- Apply fixes
- Document changes

### Step 3: Re-validate
Return to Step 1

### Step 4: Success
If validation passes after 3 or fewer attempts: Complete
If still failing: Report errors and suggest manual intervention
```

### Pattern 3: Batch Processing with Progress

```markdown
## Workflow

### Step 1: Create File List
```bash
find . -name "*.txt" > files.list
```

### Step 2: Process Each File
```bash
while read file; do
  echo "Processing: $file"
  python scripts/process.py "$file"
done < files.list
```

### Step 3: Generate Summary
```bash
python scripts/summarize.py --input files.list
```

Progress tracking:
- [ ] Files discovered: __
- [ ] Files processed: __
- [ ] Errors encountered: __
```

### Pattern 4: Interactive Decision

```markdown
## Workflow

### Step 1: Determine Operation Type

Ask user or infer from context:
- Creating new content?
- Editing existing content?
- Converting format?

### Step 2: Route to Appropriate Workflow

**If creating**:
1. Generate structure
2. Populate content
3. Validate output

**If editing**:
1. Load existing content
2. Apply modifications
3. Preserve metadata

**If converting**:
1. Parse source format
2. Transform data
3. Validate conversion
```

---

## Supporting File Examples

### Example: reference.md Structure

```markdown
# Skill Name: Complete Reference

## Table of Contents

1. [API Reference](#api-reference)
2. [Configuration Options](#configuration-options)
3. [Field Specifications](#field-specifications)
4. [Error Codes](#error-codes)

---

## API Reference

### Function: process_data()

**Signature**:
```python
def process_data(
    input_path: Path,
    output_path: Path,
    options: Dict[str, Any]
) -> ProcessResult
```

**Parameters**:
- `input_path`: Path to input file
- `output_path`: Path for output file
- `options`: Processing options dict

**Returns**:
- `ProcessResult` object with status and metadata

**Raises**:
- `FileNotFoundError`: Input file doesn't exist
- `ValidationError`: Input data invalid
- `ProcessingError`: Processing failed

**Example**:
```python
result = process_data(
    Path("input.json"),
    Path("output.json"),
    {"validate": True, "strict": False}
)
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `validate` | bool | `True` | Enable validation |
| `strict` | bool | `False` | Strict mode |
| `timeout` | int | `30` | Timeout in seconds |
| `retries` | int | `3` | Max retry attempts |

---

## Error Codes

| Code | Name | Description | Solution |
|------|------|-------------|----------|
| `E001` | `FileNotFound` | Input file missing | Check file path |
| `E002` | `InvalidFormat` | Format not supported | Convert to supported format |
| `E003` | `ValidationFailed` | Data validation failed | Fix data errors |
```

### Example: examples.md Structure

```markdown
# Skill Name: Examples

## Example 1: Basic Usage

**Scenario**: Convert JSON to CSV

**Input** (`data.json`):
```json
[
  {"name": "Alice", "age": 30, "city": "NYC"},
  {"name": "Bob", "age": 25, "city": "SF"}
]
```

**Command**:
```bash
python scripts/convert.py data.json --format csv
```

**Output** (`data.csv`):
```csv
name,age,city
Alice,30,NYC
Bob,25,SF
```

## Example 2: Advanced Usage

**Scenario**: Convert with validation and custom delimiter

**Input** (`data.json`):
```json
[
  {"name": "Alice", "age": 30},
  {"name": "Bob", "age": "invalid"}
]
```

**Command**:
```bash
python scripts/convert.py data.json \
  --format csv \
  --validate \
  --delimiter "|"
```

**Output** (`data.csv`):
```csv
name|age
Alice|30
```

**Error log**:
```
WARNING: Row 2: Invalid age value "invalid" - skipped
```

## Example 3: Batch Processing

**Scenario**: Convert all JSON files in directory

**Command**:
```bash
find ./data -name "*.json" -exec \
  python scripts/convert.py {} --format csv \;
```

**Result**:
- `data/file1.json` → `data/file1.csv`
- `data/file2.json` → `data/file2.csv`
- `data/file3.json` → `data/file3.csv`
```

---

## Script Examples

### Example 1: Validation Script

**File: `scripts/validate.py`**

```python
#!/usr/bin/env python3
"""Validate data against schema."""

import sys
import json
from pathlib import Path
import jsonschema

def load_json(path):
    """Load JSON file with error handling."""
    try:
        return json.loads(Path(path).read_text())
    except FileNotFoundError:
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {path}: {e}", file=sys.stderr)
        sys.exit(3)

def validate(data, schema):
    """Validate data against schema."""
    try:
        jsonschema.validate(data, schema)
        return []
    except jsonschema.ValidationError as e:
        return [str(e)]
    except jsonschema.SchemaError as e:
        print(f"ERROR: Invalid schema: {e}", file=sys.stderr)
        sys.exit(3)

def main():
    if len(sys.argv) != 3:
        print("Usage: validate.py <data.json> <schema.json>")
        sys.exit(1)
    
    data = load_json(sys.argv[1])
    schema = load_json(sys.argv[2])
    
    errors = validate(data, schema)
    
    if not errors:
        print("✅ Validation passed")
        sys.exit(0)
    else:
        print("❌ Validation failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### Example 2: Transformation Script

**File: `scripts/transform.py`**

```python
#!/usr/bin/env python3
"""Transform data format."""

import sys
import json
import csv
from pathlib import Path

def json_to_csv(json_data, output_path):
    """Convert JSON array to CSV."""
    if not json_data:
        print("WARNING: Empty data", file=sys.stderr)
        return
    
    keys = json_data[0].keys()
    
    with open(output_path, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=keys)
        writer.writeheader()
        writer.writerows(json_data)
    
    print(f"✅ Converted {len(json_data)} rows to {output_path}")

def main():
    if len(sys.argv) != 3:
        print("Usage: transform.py <input.json> <output.csv>")
        sys.exit(1)
    
    try:
        json_data = json.loads(Path(sys.argv[1]).read_text())
        json_to_csv(json_data, sys.argv[2])
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

## Real-World Use Cases

### Use Case 1: Code Review Skill

**Scenario**: Automated code review for pull requests

**Skill name**: `reviewing-code-changes`

**Capabilities**:
- Analyze git diff
- Check coding standards
- Identify potential bugs
- Suggest improvements

**Key features**:
- Read-only (allowed-tools: Read, Grep, Glob, Bash(git diff:*))
- Generates detailed review report
- Prioritizes issues by severity
- Provides code examples for fixes

### Use Case 2: API Documentation Generator

**Scenario**: Generate API docs from source code

**Skill name**: `generating-api-documentation`

**Capabilities**:
- Parse source files for docstrings
- Extract type information
- Generate formatted docs
- Create navigation structure

**Key features**:
- Supports multiple languages (Python, TypeScript, Go)
- Outputs Markdown, HTML, or PDF
- Includes code examples from tests
- Cross-references related functions

### Use Case 3: Log Analysis Skill

**Scenario**: Analyze application logs for issues

**Skill name**: `analyzing-application-logs`

**Capabilities**:
- Parse log files (various formats)
- Identify errors and warnings
- Detect patterns and anomalies
- Generate summary reports

**Key features**:
- Handles large files efficiently
- Time-based filtering
- Severity-based grouping
- Interactive drill-down reports

### Use Case 4: Test Data Generator

**Scenario**: Generate realistic test data for development

**Skill name**: `generating-test-data`

**Capabilities**:
- Create sample JSON, CSV, XML
- Follow schema constraints
- Generate realistic fake data
- Support various data types

**Key features**:
- Configurable data volume
- Consistent cross-references
- Locale-specific data (names, addresses)
- Exportable in multiple formats

---

## Template Library

### Template 1: Basic Skill

```markdown
---
name: verb-ing-object
description: [What it does]. Use when [triggers].
---

# [Title] Skill

[Brief description]

## When to Use

Automatically invoke when the user:
- [Trigger 1]
- [Trigger 2]
- [Trigger 3]

## Workflow

### Step 1: [Action]
[Instructions]

### Step 2: [Action]
[Instructions]

### Step 3: [Action]
[Instructions]

## Error Handling

[Common errors and solutions]

## Notes

- [Important points]

## Related Resources

- [reference.md](reference.md)
- [examples.md](examples.md)
```

### Template 2: Read-Only Analysis Skill

```markdown
---
name: analyzing-something
description: [Analysis capabilities]. Use when [triggers].
allowed-tools: Read, Grep, Glob
---

# [Title] Analysis Skill

[Purpose]

## When to Use

[Trigger scenarios]

## Analysis Workflow

### Step 1: Scan Files
\```bash
find . -name "pattern"
\```

### Step 2: Analyze Content
\```bash
grep "pattern" files
\```

### Step 3: Generate Report
[Report format]

## Metrics

- Metric 1
- Metric 2
- Metric 3

## Output Format

[How results are presented]

## Notes

- Read-only operation
- No modifications made
```

### Template 3: Data Transformation Skill

```markdown
---
name: transforming-data-format
description: Convert between formats. Use when [triggers].
---

# Data Transformation Skill

Convert data between [format A] and [format B].

## When to Use

[Trigger scenarios]

## Workflow

### Step 1: Detect Format
Identify input format automatically.

### Step 2: Transform
Apply conversion:
\```bash
python scripts/convert.py input output
\```

### Step 3: Validate
Ensure output is valid [format].

## Supported Formats

**Input**: [List]
**Output**: [List]

## Options

- `--validate`: Validate after conversion
- `--strict`: Strict mode (fail on warnings)

## Notes

[Important constraints]
```
