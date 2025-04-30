<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductInventoryLog extends Model
{
    protected $primaryKey = 'InventoryLogID';

    protected $fillable = [
        'ProductID',
        'ChangeDate',
        'ChangeType',
        'QuantityChange',
        'NewStockLevel',
        'StaffID',
        'Notes',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'ProductID', 'ProductID');
    }

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'StaffID', 'StaffID');
    }
}
