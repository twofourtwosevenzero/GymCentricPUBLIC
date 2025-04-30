<?php

// app/Models/NotificationTemplate.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationTemplate extends Model
{
    protected $table = 'notification_templates';
    protected $fillable = ['name','content','approved'];
}
