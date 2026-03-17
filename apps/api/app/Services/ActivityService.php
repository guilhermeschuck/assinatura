<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;

class ActivityService
{
    /**
     * Registra uma atividade no log.
     *
     * @param string      $action      Identificador da ação (ex: document_created)
     * @param string      $description Texto legível por humanos
     * @param User|null   $user        Usuário que executou a ação (null = sistema/cliente)
     * @param object|null $subject     Model relacionado (Document, User, etc.)
     * @param array       $metadata    Dados extras em JSON
     */
    public static function log(
        string $action,
        string $description,
        ?User $user = null,
        ?object $subject = null,
        array $metadata = [],
    ): void {
        ActivityLog::create([
            'user_id'      => $user?->id,
            'action'       => $action,
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id'   => $subject?->id,
            'description'  => $description,
            'metadata'     => empty($metadata) ? null : $metadata,
        ]);
    }
}
