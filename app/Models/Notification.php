<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';
    protected $primaryKey = 'NotificationID';

    protected $fillable = [
        'MemberID',
        'EventTrigger',
        'Subject',
        'Sender',
        'Message',
        'NotificationMethod',
        'SentDate',
        'Status',
    ];

    public $timestamps = true; // Using created_at and updated_at
     
    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }
}
