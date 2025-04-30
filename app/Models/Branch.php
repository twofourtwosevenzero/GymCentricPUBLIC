<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Branch extends Model
{   
    use LogsActivity;
    protected $table = 'branches';
    protected $primaryKey = 'BranchID';

    // If you use incrementing integer PK:
    public $incrementing = true;
    protected $keyType   = 'int';

    protected $fillable = [
        'BranchName',
        'Location',
        'Status',
        'Contact',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('branch')
            ->setDescriptionForEvent(fn (string $eventName) => "Branch record {$eventName}")
            ->logAll(); // logs all fillable + changes
    }

    /**
     * STAFF
     * staff.BranchID -> branches.BranchID
     */
    public function staff()
    {
        return $this->belongsToMany(Staff::class, 'branch_staff', 'BranchID', 'StaffID')
            ->withPivot('BranchID', 'StaffID')
            ->using(BranchStaff::class);
    }
    
    

    /**
     * FACILITIES
     * facilities.BranchID -> branches.BranchID
     */
    public function facilities()
    {
        return $this->hasMany(Facility::class, 'BranchID', 'BranchID');
    }

    /**
     * MEMBERS (StartedBranchID)
     * members.StartedBranchID -> branches.BranchID
     * (We call this relationship "startedMembers" to be clear.)
     */
    public function startedMembers()
    {
        return $this->hasMany(Member::class, 'StartedBranchID', 'BranchID');
    }

    /**
     * LOCKERS
     * lockers.BranchID -> branches.BranchID
     */
    public function lockers()
    {
        return $this->hasMany(Locker::class, 'BranchID', 'BranchID');
    }

    /**
     * PRODUCT (Consumable Inventory)
     * products.BranchID -> branches.BranchID
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'BranchID', 'BranchID');
    }

    /**
     * EXPENSES
     * expenses.BranchID -> branches.BranchID
     */
    public function expenses()
    {
        return $this->hasMany(Expense::class, 'BranchID', 'BranchID');
    }

    /**
     * EQUIPMENT
     * equipment.BranchID -> branches.BranchID
     */
    public function equipment()
    {
        return $this->hasMany(Equipment::class, 'BranchID', 'BranchID');
    }

    /**
     * DAILY CASH FLOW
     * daily_cash_flow.BranchID -> branches.BranchID
     */
    public function dailyCashFlows()
    {
        return $this->hasMany(DailyCashFlow::class, 'BranchID', 'BranchID');
    }

    /**
     * PAYMENTS
     * payments.BranchID -> branches.BranchID
     */
    public function payments()
    {
        return $this->hasMany(Payment::class, 'BranchID', 'BranchID');
    }

    /**
     * INVOICES
     * invoices.BranchID -> branches.BranchID
     */
    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'BranchID', 'BranchID');
    }

    /**
     * WALK-INS
     * walk_in.BranchID -> branches.BranchID
     */
    public function walkIns()
    {
        return $this->hasMany(WalkIn::class, 'BranchID', 'BranchID');
    }

    /**
     * MEMBER VISITS
     * member_visit.BranchID -> branches.BranchID
     */
    public function memberVisits()
    {
        return $this->hasMany(MemberVisit::class, 'BranchID', 'BranchID');
    }

    public function staffAssignments()
    {
        return $this->belongsToMany(
            Staff::class,
            'branch_staff',
            'BranchID',
            'StaffID',
            'BranchID',
            'StaffID'
        );
    }

    public function admins()
    {
        return $this->belongsToMany(
            Admin::class, 
            'admin_branch',    // pivot table name
            'BranchID',        // foreign key on pivot table
            'AdminID'          // related key on pivot table
        );
    }

    public function members()
    {
        return $this->hasMany(\App\Models\Member::class, 'StartedBranchID', 'BranchID');
    }

    
}
