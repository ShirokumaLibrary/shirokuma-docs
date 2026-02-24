#!/usr/bin/env python3
"""
Quick validation script for skills

Usage:
    quick_validate.py <skill_directory>

Example:
    quick_validate.py .claude/skills/my-skill

Source: https://github.com/anthropics/skills/tree/main/skills/skill-creator
Modified for shirokuma-docs. Original licensed under Apache License 2.0.
"""

import sys
import re
import yaml
from pathlib import Path


# Allowed frontmatter properties
ALLOWED_PROPERTIES = {'name', 'description', 'license', 'allowed-tools', 'metadata'}


def validate_skill(skill_path):
    """
    Validate a skill directory.

    Args:
        skill_path: Path to the skill directory

    Returns:
        Tuple of (is_valid: bool, message: str)
    """
    skill_path = Path(skill_path)

    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read and validate frontmatter
    content = skill_md.read_text()
    if not content.startswith('---'):
        return False, "No YAML frontmatter found"

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter_text = match.group(1)

    # Parse YAML frontmatter
    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except yaml.YAMLError as e:
        return False, f"Invalid YAML in frontmatter: {e}"

    # Check for unexpected properties
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    # Check required fields
    if 'name' not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if 'description' not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    # Validate name
    name = frontmatter.get('name', '')
    if not isinstance(name, str):
        return False, f"Name must be a string, got {type(name).__name__}"
    name = name.strip()
    if name:
        # Check naming convention (hyphen-case)
        if not re.match(r'^[a-z0-9-]+$', name):
            return False, f"Name '{name}' should be hyphen-case (lowercase, digits, hyphens only)"
        if name.startswith('-') or name.endswith('-') or '--' in name:
            return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"
        if len(name) > 64:
            return False, f"Name too long ({len(name)} chars). Max: 64"

    # Validate description
    description = frontmatter.get('description', '')
    if not isinstance(description, str):
        return False, f"Description must be a string, got {type(description).__name__}"
    description = description.strip()
    if description:
        if '<' in description or '>' in description:
            return False, "Description cannot contain angle brackets (< or >)"
        if len(description) > 1024:
            return False, f"Description too long ({len(description)} chars). Max: 1024"

    # Check SKILL.md line count
    line_count = len(content.splitlines())
    if line_count > 500:
        return False, f"SKILL.md too long ({line_count} lines). Recommended max: 500"

    return True, f"Skill is valid! ({line_count} lines)"


def main():
    if len(sys.argv) != 2:
        print("Usage: quick_validate.py <skill_directory>")
        print("\nExample:")
        print("  quick_validate.py .claude/skills/my-skill")
        sys.exit(1)

    skill_path = sys.argv[1]
    valid, message = validate_skill(skill_path)

    if valid:
        print(f"✓ {message}")
    else:
        print(f"✗ {message}")

    sys.exit(0 if valid else 1)


if __name__ == "__main__":
    main()
