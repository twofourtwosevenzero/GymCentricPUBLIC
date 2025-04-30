<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Equipment extends Model
{   
    use LogsActivity;
    protected $table = 'equipment';
    protected $primaryKey = 'EquipmentID';

    protected $fillable = [
        'Name',
        'SerialNumber',
        'Status',
        'LastMaintenanceDate',
        'Notes',
        'BranchID', // <--- new column
    ];
    
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('equipment')
            ->setDescriptionForEvent(fn($eventName) => "Equipment record {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    public function maintenanceLogs()
    {
        return $this->hasMany(MaintenanceLog::class, 'EquipmentID', 'EquipmentID');
    }

    public function branch()
{
    return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
}

}
