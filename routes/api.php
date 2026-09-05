<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\OpportunityController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\FinanceReportController;
use App\Http\Controllers\Api\V1\DashboardOverviewController;
use App\Http\Controllers\Api\V1\RenewalController;
use App\Http\Controllers\Api\V1\RequestController as BusinessRequestController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\FollowUpController;
use App\Http\Controllers\ServiceCatalogController;

Route::prefix('v1')->group(function () {
    Route::get('health', [HealthController::class, 'index']);

    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
        
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
            Route::get('me', [AuthController::class, 'me'])->name('auth.me');
        });
    });

    Route::post('public/inquiries', [\App\Http\Controllers\Api\V1\PublicInquiryController::class, 'store'])
        ->middleware('throttle:5,1');
    Route::get('public/services', [\App\Http\Controllers\ServiceCatalogController::class, 'index']);

    Route::get('public/careers', [\App\Http\Controllers\Api\V1\PublicCareerController::class, 'index']);
    Route::get('public/careers/{career}', [\App\Http\Controllers\Api\V1\PublicCareerController::class, 'show']);
    Route::post('public/careers/{career}/apply', [\App\Http\Controllers\Api\V1\PublicCareerController::class, 'apply'])
        ->middleware('throttle:5,1');

    Route::get('public/pages/{slug}', [\App\Http\Controllers\Api\V1\PublicWebPageController::class, 'show']);
    Route::get('public/media-slots', [\App\Http\Controllers\Api\V1\PublicWebsiteMediaController::class, 'index']);
    Route::get('public/media-files/{mediaFile}/content', [\App\Http\Controllers\Api\V1\PublicMediaFileController::class, 'content']);
    Route::get('public/settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'publicSettings']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('dashboard/overview', DashboardOverviewController::class);
        Route::get('profiles/{username}', [\App\Http\Controllers\Api\V1\ProfileController::class, 'show'])->name('profiles.show');
        Route::post('profiles/{username}', [\App\Http\Controllers\Api\V1\ProfileController::class, 'update'])->name('profiles.update');
        Route::apiResource('employees', \App\Http\Controllers\Api\V1\EmployeeController::class);
        
        // Companies
        Route::apiResource('companies', CompanyController::class);
        Route::post('companies/{company}/account-manager', [CompanyController::class, 'accountManager']);
        
        // Contacts
        Route::apiResource('contacts', ContactController::class);
        Route::get('companies/{company}/contacts', [\App\Http\Controllers\Api\V1\CompanyContactController::class, 'index']);
        Route::post('companies/{company}/primary-contact', [\App\Http\Controllers\Api\V1\CompanyContactController::class, 'setPrimary']);
        
        // Leads
        Route::apiResource('leads', LeadController::class);
        Route::post('leads/{lead}/assign', [LeadController::class, 'assign']);
        Route::post('leads/{lead}/convert', [LeadController::class, 'convert']);

        // Opportunities
        Route::apiResource('opportunities', OpportunityController::class);
        Route::post('opportunities/{opportunity}/assign', [OpportunityController::class, 'assign']);
        Route::post('opportunities/{opportunity}/stage', [OpportunityController::class, 'stage']);

        // Requests
        Route::apiResource('requests', BusinessRequestController::class)
            ->parameters(['requests' => 'businessRequest']);
        Route::post('requests/{businessRequest}/assign', [BusinessRequestController::class, 'assign']);

        // Tasks
        Route::apiResource('tasks', TaskController::class);
        Route::post('tasks/{task}/assign', [TaskController::class, 'assign']);

        // Follow-ups
        Route::apiResource('follow-ups', FollowUpController::class)
            ->parameters(['follow-ups' => 'followUp']);
        Route::post('follow-ups/{followUp}/assign', [FollowUpController::class, 'assign']);

        // Notes
        Route::apiResource('notes', \App\Http\Controllers\Api\V1\NoteController::class);

        // Documents
        Route::get('documents/{document}/download', [\App\Http\Controllers\Api\V1\DocumentController::class, 'download']);
        Route::apiResource('documents', \App\Http\Controllers\Api\V1\DocumentController::class);

        // Quotations
        Route::post('quotations/{quotation}/send',    [\App\Http\Controllers\Api\V1\QuotationController::class, 'send']);
        Route::post('quotations/{quotation}/accept',  [\App\Http\Controllers\Api\V1\QuotationController::class, 'accept']);
        Route::post('quotations/{quotation}/reject',  [\App\Http\Controllers\Api\V1\QuotationController::class, 'reject']);
        Route::post('quotations/{quotation}/cancel',  [\App\Http\Controllers\Api\V1\QuotationController::class, 'cancel']);
        Route::post('quotations/{quotation}/expire',  [\App\Http\Controllers\Api\V1\QuotationController::class, 'expire']);
        Route::apiResource('quotations', \App\Http\Controllers\Api\V1\QuotationController::class);

        // Contracts
        Route::get('contracts/default-template', [\App\Http\Controllers\Api\V1\ContractTemplateController::class, 'index']);
        Route::get('contracts/{contract}/download-pdf', [\App\Http\Controllers\Api\V1\ContractController::class, 'downloadPdf']);
        Route::post('contracts/{contract}/activate',  [\App\Http\Controllers\Api\V1\ContractController::class, 'activate']);
        Route::post('contracts/{contract}/expire',    [\App\Http\Controllers\Api\V1\ContractController::class, 'expire']);
        Route::post('contracts/{contract}/terminate', [\App\Http\Controllers\Api\V1\ContractController::class, 'terminate']);
        Route::post('contracts/{contract}/cancel',    [\App\Http\Controllers\Api\V1\ContractController::class, 'cancel']);
        Route::apiResource('contracts', \App\Http\Controllers\Api\V1\ContractController::class);

        // Client Onboardings
        Route::post('client-onboardings/{client_onboarding}/start',    [\App\Http\Controllers\Api\V1\ClientOnboardingController::class, 'start']);
        Route::post('client-onboardings/{client_onboarding}/complete', [\App\Http\Controllers\Api\V1\ClientOnboardingController::class, 'complete']);
        Route::post('client-onboardings/{client_onboarding}/cancel',   [\App\Http\Controllers\Api\V1\ClientOnboardingController::class, 'cancel']);
        Route::apiResource('client-onboardings', \App\Http\Controllers\Api\V1\ClientOnboardingController::class);

        // Approvals
        Route::post('approvals/{approval}/assign',  [\App\Http\Controllers\Api\V1\ApprovalController::class, 'assign']);
        Route::post('approvals/{approval}/approve', [\App\Http\Controllers\Api\V1\ApprovalController::class, 'approve']);
        Route::post('approvals/{approval}/reject',  [\App\Http\Controllers\Api\V1\ApprovalController::class, 'reject']);
        Route::post('approvals/{approval}/cancel',  [\App\Http\Controllers\Api\V1\ApprovalController::class, 'cancel']);
        Route::apiResource('approvals', \App\Http\Controllers\Api\V1\ApprovalController::class);

        // Active Services
        Route::apiResource('service-catalog', ServiceCatalogController::class)->except(['destroy']);
        Route::post('active-services/{active_service}/activate', [\App\Http\Controllers\Api\V1\ActiveServiceController::class, 'activate']);
        Route::post('active-services/{active_service}/suspend',  [\App\Http\Controllers\Api\V1\ActiveServiceController::class, 'suspend']);
        Route::post('active-services/{active_service}/resume',   [\App\Http\Controllers\Api\V1\ActiveServiceController::class, 'resume']);
        Route::post('active-services/{active_service}/end',      [\App\Http\Controllers\Api\V1\ActiveServiceController::class, 'end']);
        Route::post('active-services/{active_service}/cancel',   [\App\Http\Controllers\Api\V1\ActiveServiceController::class, 'cancel']);
        Route::apiResource('active-services', \App\Http\Controllers\Api\V1\ActiveServiceController::class);

        // Invoices
        Route::apiResource('invoices', \App\Http\Controllers\Api\V1\InvoiceController::class);
        Route::post('invoices/{invoice}/issue', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'issue']);
        Route::post('invoices/{invoice}/cancel', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'cancel']);
        Route::post('invoices/{invoice}/mark-overdue', [\App\Http\Controllers\Api\V1\InvoiceController::class, 'markOverdue']);
        Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'show']);
        Route::post('payments/{payment}/reverse', [PaymentController::class, 'reverse']);
        Route::apiResource('renewals', RenewalController::class);
        Route::post('renewals/{renewal}/mark-due', [RenewalController::class, 'markDue']);
        Route::post('renewals/{renewal}/complete', [RenewalController::class, 'complete']);
        Route::post('renewals/{renewal}/decline', [RenewalController::class, 'decline']);
        Route::post('renewals/{renewal}/cancel', [RenewalController::class, 'cancel']);
        Route::apiResource('suppliers', SupplierController::class);
        Route::post('suppliers/{supplier}/fund', [SupplierController::class, 'fund']);
        Route::prefix('finance-reports')->group(function () {
            Route::get('overview', [FinanceReportController::class, 'overview']);
            Route::get('cash-flow', [FinanceReportController::class, 'cashFlow']);
            Route::get('sales-profit', [FinanceReportController::class, 'salesAndProfit']);
            Route::get('suppliers', [FinanceReportController::class, 'suppliers']);
            Route::get('sales-team', [FinanceReportController::class, 'salesTeam']);
            Route::get('receivables', [FinanceReportController::class, 'receivables']);
            Route::get('service-breakdown', [FinanceReportController::class, 'serviceBreakdown']);
        });

        // Inquiries
        Route::apiResource('inquiries', \App\Http\Controllers\Api\V1\InquiryController::class);
        Route::post('inquiries/{inquiry}/assign', [\App\Http\Controllers\Api\V1\InquiryController::class, 'assign']);
        Route::post('inquiries/{inquiry}/unassign', [\App\Http\Controllers\Api\V1\InquiryController::class, 'unassign']);
        Route::post('inquiries/{inquiry}/status', [\App\Http\Controllers\Api\V1\InquiryController::class, 'status']);

        // Users
        Route::get('roles-permissions', [\App\Http\Controllers\Api\V1\RolePermissionController::class, 'index']);
        Route::put('roles-permissions/{role}', [\App\Http\Controllers\Api\V1\RolePermissionController::class, 'update']);
        Route::get('users/roles', [\App\Http\Controllers\Api\V1\UserController::class, 'roles']);
        Route::post('users/{user}/activate', [\App\Http\Controllers\Api\V1\UserController::class, 'activate']);
        Route::post('users/{user}/deactivate', [\App\Http\Controllers\Api\V1\UserController::class, 'deactivate']);
        Route::post('users/{user}/reset-password', [\App\Http\Controllers\Api\V1\UserController::class, 'resetPassword']);
        Route::apiResource('users', \App\Http\Controllers\Api\V1\UserController::class);
        // Emails
        Route::apiResource('emails', \App\Http\Controllers\Api\V1\EmailController::class);
        Route::post('emails/{email}/send', [\App\Http\Controllers\Api\V1\EmailController::class, 'send']);
        Route::post('emails/{email}/cancel', [\App\Http\Controllers\Api\V1\EmailController::class, 'cancel']);
        Route::post('emails/{email}/retry', [\App\Http\Controllers\Api\V1\EmailController::class, 'retry']);

        // Email Templates
        Route::apiResource('email-templates', \App\Http\Controllers\Api\V1\EmailTemplateController::class);

        // Careers
        Route::apiResource('careers', \App\Http\Controllers\Api\V1\CareerController::class);
        Route::post('careers/{career}/publish', [\App\Http\Controllers\Api\V1\CareerController::class, 'publish']);
        Route::post('careers/{career}/close', [\App\Http\Controllers\Api\V1\CareerController::class, 'close']);
        Route::apiResource('career-applications', \App\Http\Controllers\Api\V1\CareerApplicationController::class)->except(['store']);
        Route::get('career-applications/{career_application}/download-resume', [\App\Http\Controllers\Api\V1\CareerApplicationController::class, 'downloadResume']);

        // Media
        Route::get('media-files/{media_file}/content', [\App\Http\Controllers\Api\V1\MediaFileController::class, 'content']);
        Route::get('media-files/{media_file}/download', [\App\Http\Controllers\Api\V1\MediaFileController::class, 'download']);
        Route::post('media-files/{media_file}/replace', [\App\Http\Controllers\Api\V1\MediaFileController::class, 'replace']);
        Route::apiResource('media-files', \App\Http\Controllers\Api\V1\MediaFileController::class);

        // Web Pages
        Route::apiResource('web-pages', \App\Http\Controllers\Api\V1\WebPageController::class);

        // Notifications & Activity
        Route::get('notifications/unread-count', [\App\Http\Controllers\Api\V1\NotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [\App\Http\Controllers\Api\V1\NotificationController::class, 'markAllRead']);
        Route::post('notifications/{id}/read', [\App\Http\Controllers\Api\V1\NotificationController::class, 'markRead']);
        Route::get('notifications', [\App\Http\Controllers\Api\V1\NotificationController::class, 'index']);
        Route::get('activity', [\App\Http\Controllers\Api\V1\ActivityController::class, 'index']);

        // Settings
        Route::get('settings/email', [\App\Http\Controllers\Api\V1\EmailConfigurationController::class, 'show']);
        Route::put('settings/email', [\App\Http\Controllers\Api\V1\EmailConfigurationController::class, 'update']);
        Route::post('settings/email/test-outgoing', [\App\Http\Controllers\Api\V1\EmailConfigurationController::class, 'testOutgoing']);
        Route::post('settings/email/test-incoming', [\App\Http\Controllers\Api\V1\EmailConfigurationController::class, 'testIncoming']);
        Route::get('settings', [\App\Http\Controllers\Api\V1\SettingController::class, 'index']);
        Route::put('settings/{group}', [\App\Http\Controllers\Api\V1\SettingController::class, 'updateGroup']);
    });
});
