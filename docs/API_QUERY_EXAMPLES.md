# API Query Examples

Quick reference for using pagination, filtering, and sorting in API endpoints.

## Basic Pagination

```bash
# First page (default: 20 items)
GET /api/v1/user

# Specific page and size
GET /api/v1/user?page=2&perPage=50

# Get all results (no pagination)
GET /api/v1/user?perPage=-1

# Last page (you know total from previous request)
GET /api/v1/user?page=8
```

## Sorting

```bash
# Sort by email ascending (default)
GET /api/v1/user?sortBy=email

# Sort by creation date descending
GET /api/v1/user?sortBy=createdAt&sortOrder=desc

# Sort roles by name
GET /api/v1/roles?sortBy=name&sortOrder=asc
```

## Filtering

### Exact Match (eq)

```bash
# Get active users
GET /api/v1/user?filter[isActive][eq]=true

# Get users with specific role
GET /api/v1/user?filter[role][eq]=admin

# Get system roles
GET /api/v1/roles?filter[isSystem][eq]=true
```

### Pattern Matching (Simple)

Use `contains`, `startsWith`, or `endsWith` for most cases (no `%` needed):

```bash
# Emails containing "@example.com"
GET /api/v1/user?filter[email][contains]=@example.com

# First names starting with "John"
GET /api/v1/user?filter[firstName][startsWith]=John

# Last names ending with "son"
GET /api/v1/user?filter[lastName][endsWith]=son

# Roles containing "admin"
GET /api/v1/roles?filter[name][contains]=admin
```

### Pattern Matching (Advanced - like)

Use `like` when you need custom wildcard patterns (you provide `%`):

```bash
# Custom pattern: emails from gmail OR hotmail
GET /api/v1/user?filter[email][like]=%@gmail.com
GET /api/v1/user?filter[email][like]=%@hotmail.com

# Match middle part: admin users from any company domain
GET /api/v1/user?filter[email][like]=%admin%@%.com

# Complex pattern (rarely needed)
GET /api/v1/user?filter[email][like]=%_admin@example%
```

### Not Equal (ne)

```bash
# Get non-admin users
GET /api/v1/user?filter[role][ne]=admin

# Get non-system roles
GET /api/v1/roles?filter[isSystem][ne]=true
```

### In Array (in)

```bash
# Users with multiple roles (comma-separated)
GET /api/v1/user?filter[role][in]=admin,moderator,editor

# Multiple email domains
GET /api/v1/user?filter[email][in]=user1@example.com,user2@example.com
```

### Greater Than / Less Than

```bash
# Users created after a date
GET /api/v1/user?filter[createdAt][gt]=2024-01-01T00:00:00Z

# Users created before a date
GET /api/v1/user?filter[createdAt][lt]=2024-12-31T23:59:59Z

# Date range (multiple filters)
GET /api/v1/user?filter[createdAt][gte]=2024-01-01T00:00:00Z&filter[createdAt][lte]=2024-12-31T23:59:59Z
```

### NULL Checks

```bash
# Users with no email verification
GET /api/v1/user?filter[isEmailVerified][isNull]=true

# Users with email set
GET /api/v1/user?filter[email][notNull]=true
```

## Combined Queries

### Pagination + Sorting

```bash
# Page 2, sorted by email, 30 items per page
GET /api/v1/user?page=2&perPage=30&sortBy=email&sortOrder=asc
```

### Filtering + Sorting

```bash
# Active users sorted by creation date
GET /api/v1/user?filter[isActive][eq]=true&sortBy=createdAt&sortOrder=desc
```

### Pagination + Filtering + Sorting

```bash
# Page 1, active admin users, sorted by email, 50 per page
GET /api/v1/user?page=1&perPage=50&filter[isActive][eq]=true&filter[role][eq]=admin&sortBy=email&sortOrder=asc
```

### Multiple Filters (AND logic)

```bash
# Active users with verified emails from example.com
GET /api/v1/user?filter[isActive][eq]=true&filter[isEmailVerified][eq]=true&filter[email][like]=%@example.com%
```

## Real-World Use Cases

### User Management Dashboard

```bash
# Get all active users for a table view
GET /api/v1/user?filter[isActive][eq]=true&sortBy=lastName&sortOrder=asc&page=1&perPage=20
```

### Search Functionality

```bash
# Search users by name or email
GET /api/v1/user?filter[email][like]=%search_term%&page=1&perPage=10

# Search roles by name
GET /api/v1/roles?filter[name][like]=%search_term%&sortBy=name
```

### Admin Panel

```bash
# Get all custom roles (exclude system roles)
GET /api/v1/roles?includeSystem=false&sortBy=name&sortOrder=asc

# Get all users who haven't verified email
GET /api/v1/user?filter[isEmailVerified][eq]=false&sortBy=createdAt&sortOrder=desc
```

### Reporting

```bash
# Count active users (get total from pagination.total)
GET /api/v1/user?filter[isActive][eq]=true&perPage=1

# Get all admin users for export
GET /api/v1/user?filter[role][eq]=admin&perPage=-1
```

### Permission Browsing

```bash
# Get all user-related permissions
GET /api/v1/permissions?filter[category][eq]=users&sortBy=code

# Search for specific permission
GET /api/v1/permissions?filter[code][like]=users:view%
```

## URL Encoding

When using these queries in browsers or HTTP clients, special characters should be URL encoded:

```bash
# Space → %20
# @ → %40
# % → %25 (when used in LIKE patterns, % is part of SQL syntax)

# Example: Search for emails with "@example.com"
GET /api/v1/user?filter[email][like]=%25%40example.com%25
# The %25 encodes the % wildcard, %40 encodes @
```

## Response Structure

All endpoints return:

```json
{
  "message": "Resources retrieved successfully",
  "data": [
    {
      "id": "...",
      "email": "...",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "error": null
}
```

## Error Handling

Invalid queries return error responses:

```json
{
  "message": "Error occurred",
  "data": null,
  "error": {
    "traceID": "...",
    "code": "VALIDATION_ERROR",
    "message": "Invalid sortBy field"
  }
}
```

## Performance Tips

1. **Use specific page sizes**: Don't fetch more than needed
2. **Index your queries**: Ensure filtered/sorted fields are indexed
3. **Cache results**: Cache paginated results when appropriate
4. **Use perPage=-1 sparingly**: Only for small datasets
5. **Combine filters**: More specific queries are faster

## Frontend Integration Example

```typescript
// Composable for paginated data
export function usePaginatedUsers() {
  const page = ref(1)
  const perPage = ref(20)
  const sortBy = ref('createdAt')
  const sortOrder = ref('desc')
  const filters = ref({})

  const { data, refresh } = await useFetch('/api/v1/user', {
    query: computed(() => ({
      page: page.value,
      perPage: perPage.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      ...filters.value
    }))
  })

  const users = computed(() => data.value?.data || [])
  const pagination = computed(() => data.value?.pagination)

  return {
    users,
    pagination,
    page,
    perPage,
    sortBy,
    sortOrder,
    filters,
    refresh
  }
}
```
