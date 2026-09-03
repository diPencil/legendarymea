<?php

namespace Database\Seeders;

use App\Support\LegendaryPermissions;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $legacyPermissions = [
            'view_companies', 'manage_companies',
            'view_contacts', 'manage_contacts',
            'view_leads', 'manage_leads', 'convert_leads',
            'view_opportunities', 'manage_opportunities', 'assign_opportunities',
            'view_requests', 'manage_requests', 'assign_requests',
            'view_tasks', 'manage_tasks', 'assign_tasks',
            'view_follow_ups', 'manage_follow_ups', 'assign_follow_ups',
            'view_notes', 'manage_notes',
            'send_sales_emails', 'manage_email_templates',
            'view_quotations', 'manage_quotations',
            'view_contracts', 'manage_contracts',
            'view_client_onboardings', 'manage_client_onboardings',
            'view_active_services', 'manage_active_services',
            'view_documents', 'manage_documents',
            'view_approvals', 'manage_approvals', 'decide_approvals',
            'view_reports',
            'view_invoices', 'manage_invoices',
            'view_payments', 'manage_payments',
            'view_renewals', 'manage_renewals',
            'view_suppliers', 'manage_suppliers', 'fund_supplier_balances',
            'view_finance_reports', 'manage_finance_reports',
            'view_inquiries', 'manage_inquiries',
            'view_emails', 'manage_emails', 'send_emails',
            'view_careers', 'manage_careers', 'manage_job_applications',
            'view_users', 'manage_users', 'manage_user_roles',
            'view_media', 'manage_media',
            'view_website', 'manage_website',
            'view_settings',
            'manage_employees', 'manage_roles', 'manage_settings',
            'view_audit_log'
        ];

        $permissions = array_values(array_unique(array_merge(
            LegendaryPermissions::all(),
            $legacyPermissions
        )));

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => LegendaryPermissions::GUARD]);
        }

        // create roles and assign created permissions
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => LegendaryPermissions::GUARD]);
        $superAdmin->syncPermissions(Permission::all());

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => LegendaryPermissions::GUARD]);
        $admin->syncPermissions(Permission::all());

        $employee = Role::firstOrCreate(['name' => 'employee', 'guard_name' => LegendaryPermissions::GUARD]);
        $employee->syncPermissions([
            'view_dashboard',
            'view_companies', 'view_contacts', 'view_leads', 'convert_leads', 'view_opportunities',
            'view_requests', 'view_tasks', 'view_follow_ups', 'view_notes', 'view_documents', 'download_documents',
            'send_sales_emails', 'view_quotations',
            'view_contracts', 'view_client_onboardings', 'view_active_services',
            'view_invoices', 'view_payments', 'view_renewals', 'view_approvals',
        ]);

        $client = Role::firstOrCreate(['name' => 'client', 'guard_name' => LegendaryPermissions::GUARD]);
        // Client specific permissions could be added here
    }
}
