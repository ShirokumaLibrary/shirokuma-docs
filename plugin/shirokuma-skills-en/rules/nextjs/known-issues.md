# Known Issues & CVEs

## Critical CVEs

### CVE-2025-29927 (Next.js)

**Severity**: Critical (9.1)
**Affected**: Next.js < 15.2.3
**Issue**: Middleware auth bypass via `x-middleware-subrequest` header

**Mitigation** (if upgrade not possible):
```nginx
if ($http_x_middleware_subrequest) {
    return 403;
}
proxy_set_header x-middleware-subrequest "";
```

## Framework Issues

### Next.js 16

| Issue | Fix |
|-------|-----|
| Async params error | `const { slug } = await params` |
| Node.js 18 dropped | Upgrade to Node.js 20.9.0+ |

### React 19

| Issue | Fix |
|-------|-----|
| Hydration mismatch | Use mounted state pattern |
| ref as prop deprecation | Use `element.props.ref` |

### Tailwind CSS v4

| Issue | Fix |
|-------|-----|
| CSS variable syntax | Use `var()`: `w-[var(--width)]` |
| @property inheritance | Use `@theme inline` |

### Better Auth

| Issue | Fix |
|-------|-----|
| Login redirect loop | Use `window.location.href` |
| Role not in session | Query database for role |

## Version Requirements

- **Node.js**: 20.9.0+
- **TypeScript**: 5.1.0+
- **Safari**: 16.4+ (Tailwind v4)

## Security Requirements

- **BETTER_AUTH_SECRET**: 32+ characters
- **bcrypt rounds**: 12+
- **Rate limit**: 5 attempts / 15 min (production)
