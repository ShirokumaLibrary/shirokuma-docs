# Security Review Role

## Responsibilities

Security-focused code review covering:
- OWASP Top 10 2025 vulnerabilities
- Authentication and authorization
- Input validation and injection prevention
- Sensitive data handling
- Security headers and configuration

## Required Knowledge

Load these files for context:

**Skill files (explicit load):**
- `../criteria/security.md` - Security criteria (OWASP Top 10)
- `../patterns/better-auth.md` - Auth patterns
- `../patterns/server-actions.md` - Server Action security

**Rules (auto-loaded from `.claude/rules/`):**
- `tech-stack.md` - Version information
- `known-issues.md` - CVEs and vulnerabilities

## Review Checklist

### A01: Broken Access Control
- [ ] Authorization on ALL operations
- [ ] Ownership verification
- [ ] No IDOR vulnerabilities
- [ ] Server-side validation

### A02: Security Misconfiguration
- [ ] .env in .gitignore
- [ ] No secrets in code
- [ ] Security headers configured
- [ ] CORS properly configured

### A03: Supply Chain
- [ ] Dependencies audited
- [ ] No known CVEs
- [ ] Lock file committed

### A05: Injection
- [ ] Parameterized queries
- [ ] ILIKE wildcards escaped
- [ ] No eval() or Function()
- [ ] All input validated

### A07: Authentication Failures
- [ ] BETTER_AUTH_SECRET >= 32 chars
- [ ] bcrypt rounds >= 12
- [ ] Secure cookie settings
- [ ] Rate limiting enabled

### Server Actions
- [ ] `"use server"` directive
- [ ] Auth check at start
- [ ] Zod validation
- [ ] No sensitive data in errors

### CVE Awareness
- [ ] Next.js >= 15.2.3 (CVE-2025-29927)
- [ ] Or x-middleware-subrequest blocked

## Security Anti-patterns to Detect

Check for the following security violations during review:

### Authentication Anti-patterns
- [ ] Storing passwords in plaintext
- [ ] Using predictable session tokens
- [ ] Not invalidating sessions on logout
- [ ] Returning detailed error messages on auth failure (user enumeration)

### Authorization Anti-patterns
- [ ] Client-side only authorization checks
- [ ] Accessing resources without ownership verification
- [ ] Skipping role checks
- [ ] Privilege escalation vulnerabilities

### Data Handling Anti-patterns
- [ ] Logging sensitive information
- [ ] Including sensitive data in URL parameters
- [ ] Storing sensitive data in localStorage/sessionStorage
- [ ] Including unnecessary sensitive fields in API responses

### Input Handling Anti-patterns
- [ ] Directly embedding user input in SQL/HTML/JS
- [ ] Insufficient file upload validation
- [ ] Missing redirect URL validation (open redirect)
- [ ] Processing files without Content-Type header validation

### Configuration Anti-patterns
- [ ] Hardcoded secrets
- [ ] Debug mode enabled in production
- [ ] CORS set to `*`
- [ ] Not enforcing HTTPS

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | Exploitable vulnerability | Block merge |
| **High** | Security gap, hard to exploit | Fix before merge |
| **Medium** | Potential risk | Fix recommended |
| **Low** | Best practice violation | Track for later |

## Report Format

Use template from `templates/report.md`:

1. **Security Summary**: Overall security posture
2. **Critical Vulnerabilities**: MUST fix
3. **OWASP Coverage**: Which categories affected
4. **CVE Check**: Known vulnerabilities
5. **Recommendations**: Prioritized fixes

## Trigger Keywords

- "security review"
- "セキュリティレビュー"
- "check security"
- "vulnerability scan"
