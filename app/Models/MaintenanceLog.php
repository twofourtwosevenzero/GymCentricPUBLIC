<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MaintenanceLog extends Model
{   
    use LogsActivity;
    protected $primaryKey = 'MaintenanceID';

    protected $fillable = [
        'EquipmentID',
        'MaintenanceDate',
        'IssueDescription',
        'Resolution',
        'MaintainedBy',
        'NextMaintenanceDate',
        'Notes',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('maintenance')
            ->setDescriptionForEvent(fn($eventName) => "Maintenance log {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    public function equipment()
    {
        return $this->belongsTo(Equipment::class, 'EquipmentID', 'EquipmentID');
    }

    public function maintainer()
    {
        return $this->belongsTo(Staff::class, 'MaintainedBy', 'StaffID');
    }
}
