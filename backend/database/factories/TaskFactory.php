<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Task;
use App\Models\User;
use App\Enums\TaskStatus;
use App\Enums\TaskPriority;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reference' => 'LM-TSK-' . date('Y') . '-' . $this->faker->unique()->numerify('######'),
            'title' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'status' => TaskStatus::TODO,
            'priority' => TaskPriority::NORMAL,
            'due_at' => null,
            'created_by' => User::factory(),
        ];
    }
}
