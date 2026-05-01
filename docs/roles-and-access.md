# Roles and Access Model

This application uses role-based access control for staff and residents. The roles below already exist in the database enum and application permission map.

## Role hierarchy

From highest to lowest:

1. `SUPER_ADMIN`
2. `ADMIN`
3. `MANAGER`
4. `SECURITY`
5. `RESIDENT`

Staff account creation and role changes follow a downstream rule:

- `SUPER_ADMIN` can create and assign all staff roles, including another `SUPER_ADMIN`.
- `ADMIN` can create and assign `MANAGER` and `SECURITY`.
- `MANAGER` can create and assign `SECURITY`.
- `SECURITY` cannot create staff accounts.
- `RESIDENT` accounts are not created from the staff users menu. They are created through resident registration passes.

## Role responsibilities

### Super Admin

System owner role for the organization or application operator.

Primary responsibilities:

- Manage every staff role, including other super admins.
- Manage users, buildings, units, parking rules, settings, and system health.
- View analytics, reports, audit-sensitive operational data, passes, vehicles, and violations.
- Issue and manage resident registration passes.

Use this role sparingly. It can change system-level behavior and create top-level accounts.

### Admin

Property or organization administrator role.

Primary responsibilities:

- Manage downstream staff accounts, such as managers and security.
- Manage buildings, units, parking rules, active passes, vehicles, violations, analytics, and reports.
- View system health.

Restrictions:

- Cannot create, edit, suspend, delete, or promote users to `SUPER_ADMIN` or `ADMIN`.
- Does not have the `system:admin` permission.

### Manager

Building operations role for day-to-day parking administration.

Primary responsibilities:

- Manage visitor and resident parking operations.
- View and update passes, violations, vehicles, units, analytics, and reports.
- Issue and manage resident registration passes.
- Create downstream security accounts when needed.

Restrictions:

- Cannot manage admin or super admin accounts.
- Cannot manage application settings or system health.

### Security

Patrol and enforcement role.

Primary responsibilities:

- View passes and vehicles.
- View and create violations.
- Use patrol workflows needed for parking enforcement.

Restrictions:

- Cannot create staff accounts.
- Cannot manage users, settings, buildings, units, resident registration passes, analytics, or reports.
- Cannot delete or administratively modify passes.

### Resident

Resident self-service role.

Primary responsibilities:

- View and create their own visitor passes.
- Manage their own guests and vehicles.
- Send visitor pass links.
- View their own resident activity.

Restrictions:

- Cannot access staff user management.
- Cannot be created from the generic staff users endpoint.
- Resident account setup is handled through registration passes.

## Why keep Admin and Security?

The four staff roles are valid for this application because parking operations usually need separation of duties:

- `SUPER_ADMIN` protects system ownership and top-level account creation.
- `ADMIN` supports property administration without allowing peer or owner-level privilege escalation.
- `MANAGER` supports building-level operations and resident onboarding.
- `SECURITY` supports patrol and enforcement without access to configuration or user administration.

This keeps sensitive actions limited while still allowing on-site teams to do their daily work.
