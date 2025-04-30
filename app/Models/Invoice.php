<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $table = 'invoices';
    protected $primaryKey = 'InvoiceID';

    protected $fillable = [
        'BranchID',
        'MemberID',
        'MonthlyClientID',
        'PromotionID',
        'InvoiceDate',
        'DueDate',
        'InvoiceTotal',
    ];

    // Relationship: belongs to a branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    // belongs to a member
    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    // belongs to a promotion
    public function promotion()
    {
        return $this->belongsTo(Promotions::class, 'PromotionID', 'PromotionID');
    }

    // has many line items
    public function lineItems()
    {
        return $this->hasMany(InvoiceLineItem::class, 'InvoiceID', 'InvoiceID');
    }

    // many-to-many with Payment via pivot PaymentInvoices
    public function payments()
    {
        return $this->belongsToMany(Payment::class, 'PaymentInvoices', 'InvoiceID', 'PaymentID')
                    ->withPivot('AmountAllocated')
                    ->withTimestamps();
    }

    public function monthlyClient()
    {
        return $this->belongsTo(MonthlyClient::class, 'MonthlyClientID');
    }
}
