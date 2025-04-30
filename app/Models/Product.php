<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';
    protected $primaryKey = 'ProductID';

    protected $fillable = [
        'ProductName',
        'Category',
        'StockLevel',
        'ReorderLevel',
        'UnitOfMeasure',
        'Cost',
        'Price',
        'Notes',
        'BranchID', // <--- new column
    ];

    // Relationship: This product is stored in one branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    public function inventoryLogs()
    {
        return $this->hasMany(ProductInventoryLog::class, 'ProductID', 'ProductID');
    }
}
