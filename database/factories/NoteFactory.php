<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Contact;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\Note;
use App\Models\Opportunity;
use App\Models\Request;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Note>
 */
class NoteFactory extends Factory
{
    protected $model = Note::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => $this->faker->optional(0.7)->sentence(),
            'body' => $this->faker->paragraphs(3, true),
            'created_by' => User::factory(),
            'company_id' => null,
            'contact_id' => null,
            'lead_id' => null,
            'opportunity_id' => null,
            'request_id' => null,
            'task_id' => null,
            'follow_up_id' => null,
        ];
    }
}
