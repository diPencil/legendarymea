<?php

namespace App\Services;

use App\Models\Opportunity;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Contact;
use App\Models\Lead;
use Illuminate\Support\Facades\DB;

class UpdateOpportunityService
{
    public function execute(Opportunity $opportunity, array $data, ?int $updatedBy = null): Opportunity
    {
        return DB::transaction(function () use ($opportunity, $data, $updatedBy) {
            $oldData = $opportunity->toArray();
            
            // Ensure stage, ownership, and close data are not bypassed through general update.
            unset($data['stage']);
            unset($data['owner_id']);
            unset($data['closed_at']);
            unset($data['lost_reason']);

            $companyId = array_key_exists('company_id', $data)
                ? (int) $data['company_id']
                : (int) $opportunity->company_id;

            if (array_key_exists('company_id', $data)) {
                if (!array_key_exists('primary_contact_id', $data) && $this->hasIncompatiblePrimaryContact($opportunity, $companyId)) {
                    $data['primary_contact_id'] = null;
                }

                if (!array_key_exists('lead_id', $data) && $this->hasIncompatibleSourceLead($opportunity, $companyId)) {
                    $data['lead_id'] = null;
                }
            }

            $opportunity->update($data);

            AuditLog::create([
                'user_id' => $updatedBy,
                'action' => 'opportunity.updated',
                'subject_type' => Opportunity::class,
                'subject_id' => $opportunity->id,
                'old_values' => $oldData,
                'new_values' => $opportunity->toArray(),
                'request_context' => [
                    'ip' => request()->ip(),
                    'user_agent' => request()->userAgent()
                ]
            ]);

            CrmActivity::create([
                'actor_id' => $updatedBy,
                'type' => 'opportunity.updated',
                'subject_type' => Opportunity::class,
                'subject_id' => $opportunity->id,
                'company_id' => $opportunity->company_id,
                'metadata' => [
                    'opportunity_id' => $opportunity->id,
                    'updated_fields' => array_keys($data)
                ],
            ]);

            return $opportunity;
        });
    }

    private function hasIncompatiblePrimaryContact(Opportunity $opportunity, int $companyId): bool
    {
        if (!$opportunity->primary_contact_id) {
            return false;
        }

        $contact = $opportunity->relationLoaded('primaryContact')
            ? $opportunity->primaryContact
            : Contact::find($opportunity->primary_contact_id);

        return $contact !== null && (int) $contact->company_id !== $companyId;
    }

    private function hasIncompatibleSourceLead(Opportunity $opportunity, int $companyId): bool
    {
        if (!$opportunity->lead_id) {
            return false;
        }

        $lead = $opportunity->relationLoaded('sourceLead')
            ? $opportunity->sourceLead
            : Lead::find($opportunity->lead_id);

        return $lead !== null
            && $lead->company_id !== null
            && (int) $lead->company_id !== $companyId;
    }
}
