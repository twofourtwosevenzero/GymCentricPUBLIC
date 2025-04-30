<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Promotions extends Model
{   
    use LogsActivity;
    protected $primaryKey = 'PromotionID';

    protected $fillable = [
        'Name',
        'DiscountType',
        'DiscountValue',
        'StartDate',
        'EndDate',
        'TermsAndConditions',
        'Status',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('promotion')
            ->setDescriptionForEvent(fn ($eventName) => "Promotion was {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    // If an invoice references a single promotion
    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'PromotionID', 'PromotionID');
    }
}
