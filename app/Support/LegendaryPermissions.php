<?php

namespace App\Support;

final class LegendaryPermissions
{
    public const GUARD = 'web';

    public static function groups(): array
    {
        return [
            'Dashboard' => [
                'view_dashboard',
            ],
            'CRM' => [
                'view_employees', 'create_employees', 'update_employees', 'delete_employees',
                'view_companies', 'create_companies', 'update_companies', 'delete_companies',
                'view_contacts', 'create_contacts', 'update_contacts', 'delete_contacts',
                'view_leads', 'create_leads', 'update_leads', 'delete_leads', 'assign_leads', 'convert_leads',
                'view_opportunities', 'create_opportunities', 'update_opportunities', 'delete_opportunities', 'assign_opportunities',
            ],
            'Operations' => [
                'view_requests', 'create_requests', 'update_requests', 'delete_requests', 'assign_requests',
                'view_tasks', 'create_tasks', 'update_tasks', 'delete_tasks', 'assign_tasks',
                'view_follow_ups', 'create_follow_ups', 'update_follow_ups', 'delete_follow_ups', 'assign_follow_ups',
                'view_notes', 'create_notes', 'update_notes', 'delete_notes',
                'view_documents', 'create_documents', 'update_documents', 'delete_documents', 'download_documents',
            ],
            'Commercial' => [
                'view_quotations', 'create_quotations', 'update_quotations', 'delete_quotations', 'issue_quotations', 'cancel_quotations',
                'view_approvals', 'create_approvals', 'update_approvals', 'delete_approvals', 'approve_approvals', 'reject_approvals',
                'view_contracts', 'create_contracts', 'update_contracts', 'delete_contracts', 'activate_contracts', 'cancel_contracts',
                'expire_contracts', 'terminate_contracts',
                'view_client_onboardings', 'create_client_onboardings', 'update_client_onboardings', 'delete_client_onboardings',
                'start_client_onboardings', 'complete_client_onboardings', 'cancel_client_onboardings',
                'view_active_services', 'create_active_services', 'update_active_services', 'delete_active_services',
                'activate_active_services', 'suspend_active_services', 'resume_active_services', 'end_active_services', 'cancel_active_services',
                'view_service_catalog', 'create_service_catalog', 'update_service_catalog',
            ],
            'Finance' => [
                'view_invoices', 'create_invoices', 'update_invoices', 'delete_invoices', 'issue_invoices', 'cancel_invoices', 'print_invoices',
                'view_payments', 'create_payments', 'reverse_payments',
                'view_suppliers', 'create_suppliers', 'update_suppliers', 'delete_suppliers', 'fund_supplier_balances', 'view_supplier_ledger',
                'view_internal_finance', 'view_purchase_cost', 'view_profit', 'view_supplier_balances',
                'view_finance_reports',
                'view_renewals', 'create_renewals', 'update_renewals', 'delete_renewals', 'complete_renewals', 'decline_renewals', 'cancel_renewals',
            ],
            'Administration' => [
                'view_inquiries', 'create_inquiries', 'update_inquiries', 'delete_inquiries', 'assign_inquiries',
                'view_emails', 'create_emails', 'update_emails', 'delete_emails', 'send_emails',
                'view_email_templates', 'create_email_templates', 'update_email_templates', 'delete_email_templates',
                'view_careers', 'create_careers', 'update_careers', 'delete_careers', 'publish_careers', 'close_careers',
                'view_career_applications', 'update_career_applications', 'delete_career_applications', 'download_career_resumes',
                'view_users', 'create_users', 'update_users', 'delete_users',
                'view_roles_permissions', 'manage_roles_permissions',
                'view_media', 'create_media', 'update_media', 'delete_media',
                'view_settings', 'update_settings',
            ],
        ];
    }

    public static function all(): array
    {
        return array_values(array_unique(array_merge(...array_values(self::groups()))));
    }

    public static function legacy(): array
    {
        return [
            'manage_employees', 'manage_companies', 'manage_contacts', 'manage_leads', 'manage_opportunities',
            'manage_requests', 'manage_tasks', 'manage_follow_ups', 'manage_notes', 'manage_documents',
            'manage_quotations', 'manage_contracts', 'manage_client_onboardings', 'manage_active_services',
            'manage_approvals', 'decide_approvals', 'manage_invoices', 'manage_payments', 'manage_renewals',
            'manage_suppliers', 'manage_finance_reports', 'manage_inquiries', 'manage_emails',
            'manage_email_templates', 'manage_careers', 'manage_job_applications', 'manage_users',
            'manage_user_roles', 'manage_roles', 'manage_media', 'manage_settings', 'view_reports',
            'view_audit_log', 'send_sales_emails',
        ];
    }

    public static function visibleToMatrix(): array
    {
        return self::groups();
    }
}
