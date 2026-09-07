# Legendary CRM

## Employee Module

The Employee module manages internal business and staff profiles, separating authentication credentials (User) from HR/business metadata (Employee).

### Employee ↔ User Relationship
- An Employee profile `belongsTo` a single `User`.
- One User may have at most one Employee profile (enforced by DB `user_id` unique constraint and app validation).
- Users with only the `client` role cannot be assigned an Employee profile.
- If an Employee is soft-deleted, their User account survives and remains intact.

### Reference Generator
- Generates a unique `employee_code` sequentially (e.g., `LM-EMP-000001`) via `ReferenceGeneratorService`.
- Locking is used during generation to prevent race conditions.

### Manager Hierarchy
- Employees can have a `manager_id` linking to another Employee.
- Self-management is strictly blocked (an employee cannot be their own manager).
- Circular reporting chains (A → B → C → A) are detected and blocked recursively during updates via `UpdateEmployeeService`.
- `manager_id` uses `nullOnDelete()` to prevent cascade deletion of subordinates when a manager is removed.

### Statuses
Employees use the following valid statuses:
- `active`
- `inactive`
- `on_leave`

### Permissions & Policy
- All Employee endpoints are protected by `EmployeePolicy`.
- Requires the `manage_employees` permission.
- Super Admins bypass policy checks centrally via the Phase 0 `AuthServiceProvider` gate.
- Clients are inherently denied access to manage employees.

### API & Features
- **Pagination**: Supports configurable `per_page` up to a maximum.
- **Search**: Scans `employee_code`, `job_title`, `department`, `phone`, and User `name` / `email`.
- **Filtering**: Allows exact matches on `status`, `department`, and `manager_id`.
- **Sorting**: Strictly whitelisted to prevent SQL injection. Allowed columns: `employee_code`, `created_at`, `hire_date`, `status`.
- **Soft Deletion**: Employees are soft-deleted to preserve historical relationships, while retaining the linked User.

### Audit Logging
- Employee actions trigger records in the `audit_logs` table (`employee.created`, `employee.updated`, `employee.deleted`).
- Highly sensitive fields like `password` and `remember_token` are strictly excluded from audit payloads.

## Companies Module

The Companies module is the central entity for business relationships, managing accounts that can act as leads, prospects, clients, partners, or suppliers concurrently.

### Company Relationships
- A Company can have multiple active relationships concurrently via the `company_relationships` table (e.g., a `partner` can also be a `client`).
- The obsolete single `relationship_type` field has been dropped in favor of the normalized table to prevent data constraints.
- Relationships are synchronized transactionally during creation and updates.

### Account Managers
- Companies can be assigned to an `Employee` as their Account Manager.
- Assigning an Account Manager automatically dispatches a database notification to the target Employee.
- Account Manager assignment is tracked in both `audit_logs` and `crm_activities`.
- Only active Employees can be assigned as Account Managers.

### CRM Activities & Audit Logs
- Every significant action (creation, update, deletion, relationship change, account manager change) is logged in the `crm_activities` table to build a comprehensive timeline for the Company.
- The `audit_logs` system continues to track system-level data mutations for compliance.

### Permissions & Policy
- Protected by `CompanyPolicy`.
- Requires `view_companies` for read operations and `manage_companies` for mutations.
- Super Admin continues to bypass these checks.

### API & Features
- **Pagination**: Configurable `per_page` up to a maximum.
- **Search**: Scans `reference`, `name`, `legal_name`, `email`, `phone`, and `website`.
- **Filtering**: Allows exact matches on `status`, `country_code`, `account_manager_id`, and `relationship`.
- **Sorting**: Whitelisted for `reference`, `name`, `status`, `created_at`, `updated_at`.
- **Soft Deletion**: Companies are soft-deleted, preventing the destruction of commercial history.

*(Contacts, Leads, and Opportunities are pending implementation).*

## Leads Module
The Leads module captures prospects before they are qualified and converted.

### Lead Conversion
- Converts a Lead to a Company, Contact, and Opportunity.
- Strictly protected by ConvertLeadService.
- Uses exact mode definitions (create/existing) for Company and Contact.
- Returns 409 Conflict if duplicate Company or Contact is found.
- Conversions are transactional. If it fails, everything rolls back.

## Opportunities Module
Tracks deals and potential revenue.

### Stages
- Enforces strict stage changes via `ChangeOpportunityStageService`.
- Deals moved to `lost` require a `lost_reason`.
- Stage changes are audited and recorded in `crm_activities`.
