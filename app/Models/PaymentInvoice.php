<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentInvoice extends Model
{
    protected $table = 'PaymentInvoices';
    protected $primaryKey = 'PaymentInvoiceID';

    protected $fillable = [
        'PaymentID',
        'InvoiceID',
        'AmountAllocated',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'PaymentID', 'PaymentID');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'InvoiceID', 'InvoiceID');
    }
}
