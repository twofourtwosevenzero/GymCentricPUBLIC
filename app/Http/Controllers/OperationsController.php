<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Product;
use App\Models\ProductInventoryLog;
use App\Models\Locker;
use App\Models\LockerUsage;
use App\Models\Equipment;
use App\Models\MaintenanceLog;
use App\Models\MemberVisit;
use App\Models\Member;
use App\Models\WalkIn; 
use App\Models\Payment;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\PaymentInvoice;
use App\Models\DailyCashFlow;
use Illuminate\Support\Facades\DB;

class OperationsController extends Controller
{
    // ------------------------------------------------------------
    // A) PRODUCT + INVENTORY
    // ------------------------------------------------------------

    /**
     * List products. Staff sees only their branches; Admin/Owner see all.
     */
    public function indexProducts()
    {
        $staff = auth('staff')->user();

        $query = Product::query()->orderBy('ProductName', 'asc');

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $query->whereIn('BranchID', $branchIDs);
        }

        $products = $query->get();

        return response()->json([
            'products' => $products
        ]);
    }

    /**
     * Store or update a product. Staff => must match one of their branches.
     */
    public function storeProduct(Request $request)
    {
        $staff = auth('staff')->user();

        $data = $request->validate([
            'ProductID'      => 'nullable|exists:products,ProductID',
            'ProductName'    => 'required|string|max:255',
            'Category'       => 'nullable|string|max:100',
            'StockLevel'     => 'required|integer|min:0',
            'ReorderLevel'   => 'nullable|integer|min:0',
            'UnitOfMeasure'  => 'nullable|string|max:50',
            'Cost'           => 'nullable|numeric|min:0',
            'Price'          => 'nullable|numeric|min:0',
            'Notes'          => 'nullable|string',
            'BranchID'       => 'nullable|exists:branches,BranchID',
        ]);

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');

            if (!empty($data['ProductID'])) {
                $product = Product::findOrFail($data['ProductID']);
                if (!$branchIDs->contains($product->BranchID)) {
                    return response()->json(['error' => 'Unauthorized: different branch'], 403);
                }
                $product->update($data);
            } else {
                if (empty($data['BranchID']) || !$branchIDs->contains($data['BranchID'])) {
                    return response()->json([
                        'error' => 'Cannot create product in another branch'
                    ], 403);
                }
                Product::create($data);
            }
        } else {
            if (!empty($data['ProductID'])) {
                $product = Product::findOrFail($data['ProductID']);
                $product->update($data);
            } else {
                Product::create($data);
            }
        }

        return response()->json(['message' => 'Product saved successfully.'], 200);
    }

    /**
     * Adjust stock => create a ProductInventoryLog. Staff => branch check.
     */
    public function adjustStock(Request $request)
    {
        $staff = auth('staff')->user();

        $data = $request->validate([
            'ProductID'       => 'required|exists:products,ProductID',
            'QuantityChange'  => 'required|integer',
            'ChangeType'      => 'nullable|string|max:50',
            'Notes'           => 'nullable|string',
        ]);

        DB::transaction(function () use ($data, $staff) {
            $product = Product::lockForUpdate()->findOrFail($data['ProductID']);

            if ($staff) {
                $branchIDs = $staff->branches->pluck('BranchID');
                if (!$branchIDs->contains($product->BranchID)) {
                    abort(403, 'Cannot adjust stock of another branch’s product.');
                }
            }

            $newStock = $product->StockLevel + $data['QuantityChange'];
            if ($newStock < 0) {
                abort(400, 'Stock cannot go below zero.');
            }
            $product->StockLevel = $newStock;
            $product->save();

            ProductInventoryLog::create([
                'ProductID'      => $product->ProductID,
                'ChangeDate'     => now(),
                'ChangeType'     => $data['ChangeType'] ?? 'Adjustment',
                'QuantityChange' => $data['QuantityChange'],
                'NewStockLevel'  => $newStock,
                'StaffID'        => $staff ? $staff->StaffID : null,
                'Notes'          => $data['Notes'] ?? null,
            ]);
        });

        return response()->json(['message' => 'Stock adjusted successfully.'], 200);
    }

    /**
     * Delete product. Staff => must match branch; otherwise admin/owner.
     */
    public function destroyProduct($id)
    {
        $staff = auth('staff')->user();

        $product = Product::findOrFail($id);

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            if (!$branchIDs->contains($product->BranchID)) {
                return response()->json([
                    'error' => 'Cannot delete product from another branch.'
                ], 403);
            }
        }
        $product->delete();

        return response()->json(['message' => 'Product removed successfully.'], 200);
    }

    /* ------------------------------------------------------------------
     * P. LOCKER & LOCKER USAGE (JSON Responses)
     * ------------------------------------------------------------------ */

    /**
     * List lockers. Staff sees only lockers from their branches.
     */
    public function indexLockers()
    {
        $staff = auth('staff')->user();
    
        $query = Locker::with([
            'lockerUsages' => function ($q) {
                $q->where('Returned', false)
                  ->with('member')
                  ->orderBy('BorrowDate', 'desc');
            }
        ]);
    
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $query->whereIn('BranchID', $branchIDs);
        }
        $lockers = $query->get();
    
        $response = $lockers->map(function ($locker) {
            $activeUsage = $locker->lockerUsages->first();
            return [
                'LockerID'     => $locker->LockerID,
                'LockerNumber' => $locker->LockerNumber,
                'Status'       => $locker->Status,
                'BranchID'     => $locker->BranchID,
                'occupant'     => $activeUsage ? [
                    'UsageID'    => $activeUsage->UsageID,
                    'MemberID'   => $activeUsage->MemberID,
                    'FullName'   => $activeUsage->member->FullName ?? $activeUsage->WalkInName ?? '', // Fix: Include WalkInName
                ] : null,
            ];
        });
    
        return response()->json(['lockers' => $response], 200);
    }
    

    /**
     * Create or update a locker. Staff can only operate on their own branches.
     */
    public function storeLocker(Request $request)
    {
        try {
            $staff = auth('staff')->user();

            $data = $request->validate([
                'LockerID'     => 'nullable|exists:lockers,LockerID',
                'LockerNumber' => 'required|string|max:50',
                'Status'       => 'required|string|max:50',
                'Notes'        => 'nullable|string',
                'BranchID'     => 'nullable|exists:branches,BranchID',
            ]);

            // Enforce staff branch restrictions
            if ($staff) {
                $branchIDs = $staff->branches->pluck('BranchID');

                // For new locker: ensure BranchID is provided and valid.
                if (empty($data['LockerID'])) {
                    if (empty($data['BranchID']) || !$branchIDs->contains($data['BranchID'])) {
                        return response()->json([
                            'error' => 'Cannot create locker in an unauthorized branch.'
                        ], 403);
                    }
                }

                // For update: ensure the existing locker belongs to a staff branch.
                if (!empty($data['LockerID'])) {
                    $locker = Locker::findOrFail($data['LockerID']);
                    if (!$branchIDs->contains($locker->BranchID)) {
                        return response()->json([
                            'error' => 'Cannot update a locker from another branch.'
                        ], 403);
                    }
                }
            }

            if (!empty($data['LockerID'])) {
                $locker = Locker::findOrFail($data['LockerID']);
                $locker->update($data);
            } else {
                $locker = Locker::create($data);
            }

            return response()->json([
                'message' => 'Locker saved successfully.',
                'locker'  => $locker
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error'  => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Server error.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Borrow a locker key. Staff can only borrow lockers from their own branches.
     */
    public function borrowLockerKey(Request $request)
    {
        try {
            $staff = auth('staff')->user();
    
            $data = $request->validate([
                'LockerID'   => 'required|exists:lockers,LockerID',
                'MemberID'   => 'nullable|exists:members,MemberID',
                'WalkInName' => 'nullable|string',
                'Notes'      => 'nullable|string',
            ]);
    
            if (!$data['MemberID'] && !$data['WalkInName']) {
                return response()->json([
                    'error' => 'Either MemberID or WalkInName is required.',
                ], 400);
            }
    
            if ($staff) {
                $branchIDs = $staff->branches->pluck('BranchID');
                $lockerCheck = Locker::where('LockerID', $data['LockerID'])
                    ->whereIn('BranchID', $branchIDs)
                    ->first();
                if (!$lockerCheck) {
                    return response()->json([
                        'error' => 'Cannot borrow a locker from another branch.'
                    ], 403);
                }
            }
    
            LockerUsage::create([
                'LockerID'    => $data['LockerID'],
                'MemberID'    => $data['MemberID'],
                'WalkInName'  => $data['WalkInName'],
                'KeyBorrowed' => true,
                'BorrowDate'  => now(),
                'Returned'    => false,
                'Notes'       => $data['Notes'] ?? null,
            ]);
    
            Locker::where('LockerID', $data['LockerID'])->update(['Status' => 'Occupied']);
    
            return response()->json([
                'message' => 'Locker key borrowed successfully.'
            ], 200);
    
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error'  => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Server error.',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    

    /**
     * Return a locker key. Staff can only return lockers from their own branches.
     */
    public function returnLockerKey($usageId)
    {
        try {
            $staff = auth('staff')->user();
            $usage = LockerUsage::findOrFail($usageId);

            if ($staff) {
                $branchIDs = $staff->branches->pluck('BranchID');
                if (!$branchIDs->contains($usage->locker->BranchID)) {
                    return response()->json([
                        'error' => 'Cannot return a locker key from another branch.'
                    ], 403);
                }
            }

            if ($usage->Returned) {
                return response()->json([
                    'message' => 'Locker key was already returned.'
                ], 200);
            }

            $usage->update([
                'ReturnDate' => now(),
                'Returned'   => true,
            ]);

            if ($usage->locker) {
                $usage->locker->update(['Status' => 'Available']);
            }

            return response()->json([
                'message' => 'Locker key returned successfully.'
            ], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Usage record not found.'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Server error.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display locker activity logs. Staff see only logs from their branches.
     */
    public function lockerActivityLog()
{
    try {
        $staff = auth('staff')->user();

        $query = LockerUsage::with(['member', 'locker']);

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $query->whereHas('locker', function ($q) use ($branchIDs) {
                $q->whereIn('BranchID', $branchIDs);
            });
        }

        $usageLogs = $query->orderBy('BorrowDate', 'desc')->get();

        // Fix: Merge Member Name and Walk-In Name
        $formattedLogs = $usageLogs->map(function ($usage) {
            return [
                'UsageID'      => $usage->UsageID,
                'LockerID'     => $usage->LockerID,
                'OccupantName' => $usage->member->FullName ?? $usage->WalkInName ?? '—', // Fix: Show either Member or Walk-In
                'BorrowDate'   => $usage->BorrowDate,
                'ReturnDate'   => $usage->ReturnDate,
                'Returned'     => $usage->Returned,
                'Notes'        => $usage->Notes,
            ];
        });

        return response()->json(['usages' => $formattedLogs], 200);
    } catch (\Exception $e) {
        return response()->json([
            'error'   => 'Server error.',
            'message' => $e->getMessage()
        ], 500);
    }
}


    /* ------------------------------------------------------------------
     * Q. EQUIPMENT & MAINTENANCE
     * ------------------------------------------------------------------ */

    /**
     * List equipment. Staff sees only equipment in their branches.
     */
    public function indexEquipment()
    {
        $staff = auth('staff')->user();

        $query = Equipment::orderBy('Name', 'asc');

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $query->whereIn('BranchID', $branchIDs);
        }

        $equipment = $query->get();

        return response()->json([
            'equipment' => $equipment
        ]);
    }

    /**
     * Store or update an equipment record.
     */
    public function storeEquipment(Request $request)
    {
        $staff = auth('staff')->user();

        $data = $request->validate([
            'EquipmentID'         => 'nullable|exists:equipment,EquipmentID',
            'Name'                => 'required|string|max:100',
            'SerialNumber'        => 'nullable|string|max:100',
            'Status'              => 'required|string|max:50',
            'LastMaintenanceDate' => 'nullable|date',
            'Notes'               => 'nullable|string',
            'BranchID'            => 'nullable|exists:branches,BranchID',
        ]);

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');

            if (!empty($data['EquipmentID'])) {
                $eq = Equipment::findOrFail($data['EquipmentID']);
                if (!$branchIDs->contains($eq->BranchID)) {
                    return response()->json(['error' => 'Cannot update another branch’s equipment.'], 403);
                }
                $eq->update($data);
            } else {
                if (empty($data['BranchID']) || !$branchIDs->contains($data['BranchID'])) {
                    return response()->json([
                        'error' => 'Cannot create equipment for another branch.'
                    ], 403);
                }
                Equipment::create($data);
            }
        } else {
            if (!empty($data['EquipmentID'])) {
                $eq = Equipment::findOrFail($data['EquipmentID']);
                $eq->update($data);
            } else {
                Equipment::create($data);
            }
        }

        return response()->json(['message' => 'Equipment saved successfully.'], 200);
    }

    /**
     * List maintenance logs. Staff see only logs for equipment in their branches.
     */
    public function indexMaintenanceLogs()
    {
        $staff = auth('staff')->user();

        $query = MaintenanceLog::with(['equipment', 'maintainer'])->latest();

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $query->whereHas('equipment', function($q) use ($branchIDs) {
                $q->whereIn('BranchID', $branchIDs);
            });
        }

        return response()->json([
            'logs' => $query->get()
        ]);
    }

    /**
     * Create a new maintenance log record.
     */
    public function storeMaintenanceLog(Request $request)
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();

        $data = $request->validate([
            'EquipmentID'         => 'required|exists:equipment,EquipmentID',
            'MaintenanceDate'     => 'required|date',
            'IssueDescription'    => 'nullable|string|max:255',
            'Resolution'          => 'nullable|string|max:255',
            'MaintainedBy'        => 'nullable|integer',
            'NextMaintenanceDate' => 'nullable|date|after_or_equal:MaintenanceDate',
            'Notes'               => 'nullable|string',
        ]);

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $equipment = Equipment::findOrFail($data['EquipmentID']);
            if (!$branchIDs->contains($equipment->BranchID)) {
                return response()->json(['error' => 'Unauthorized: different branch'], 403);
            }
        }

        if (empty($data['MaintainedBy'])) {
            if ($staff) {
                $data['MaintainedBy'] = $staff->StaffID;
            } else {
                $data['MaintainedBy'] = null;
            }
        }

        $log = MaintenanceLog::create($data);

        return response()->json([
            'success' => true,
            'log'     => $log->load('equipment'),
            'message' => 'Maintenance log recorded successfully'
        ], 201);
    }

    /**
     * Update existing maintenance log.
     */
    public function updateMaintenanceLog(Request $request, $id)
    {
        $staff = auth('staff')->user();

        $log = MaintenanceLog::findOrFail($id);
        $data = $request->validate([
            'IssueDescription'    => 'nullable|string|max:255',
            'Resolution'          => 'nullable|string|max:255',
            'NextMaintenanceDate' => 'nullable|date',
            'Notes'               => 'nullable|string',
        ]);

        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            if (!$branchIDs->contains($log->equipment->BranchID)) {
                return response()->json(['error' => 'Unauthorized: different branch'], 403);
            }
        }

        $log->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance log updated successfully.',
            'log' => $log
        ]);
    }

    /**
     * Delete MaintenanceLog.
     */
    public function destroyMaintenanceLog($id)
    {
        $staff = auth('staff')->user();

        $log = MaintenanceLog::findOrFail($id);
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            if (!$branchIDs->contains($log->equipment->BranchID)) {
                return response()->json(['error' => 'Unauthorized: different branch'], 403);
            }
        }

        $log->delete();

        return response()->json([
            'success' => true,
            'message' => 'Maintenance log deleted successfully.'
        ]);
    }

    public function getMaintenanceStats()
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();
    
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $pendingCount = MaintenanceLog::where('Resolution', 'pending')
                ->whereHas('equipment', function($q) use ($branchIDs) {
                    $q->whereIn('BranchID', $branchIDs);
                })->count();
        } else {
            $pendingCount = MaintenanceLog::where('Resolution', 'pending')->count();
        }
    
        return response()->json([
            'pending_maintenance' => $pendingCount
        ]);
    }

    /* ------------------------------------------------------------------
     * S. MEMBER VISIT (JSON Endpoints)
     * ------------------------------------------------------------------ */

    /**
     * Store a new member visit (check-in).
     */
    public function storeVisit(Request $request)
    {
        // Validate input
        $data = $request->validate([
            'MemberID'      => 'required|exists:members,MemberID',
            'VisitDate'     => 'nullable|date',       // Defaults to today if omitted
            'VisitTime'     => 'nullable',            // Defaults to now if omitted
            'CheckInMethod' => 'nullable|string|max:50', // e.g. "biometric", "card", "manual"
            'Remarks'       => 'nullable|string',
            'BranchID'      => 'required|exists:branches,BranchID',
        ]);
    
        // Set default date/time if none provided
        $data['VisitDate']     = $data['VisitDate'] ?? Carbon::today()->format('Y-m-d');
        $data['VisitTime']     = $data['VisitTime'] ?? Carbon::now()->format('H:i:s');
        $data['CheckInMethod'] = $data['CheckInMethod'] ?? 'card';
    
        // Check if the member is already checked in for this branch on the same day
        $existingVisit = MemberVisit::where('MemberID', $data['MemberID'])
            ->where('BranchID', $data['BranchID'])
            ->whereDate('VisitDate', $data['VisitDate'])
            ->first();
    
        if ($existingVisit) {
            return response()->json([
                'message' => 'Member is already checked in for today at this branch.'
            ], 409);
        }
    
        // Create the visit record
        $visit = MemberVisit::create($data);
    
        return response()->json([
            'message' => 'Visit logged successfully.',
            'visit'   => $visit
        ], 201);
    }
    
    
    /**
     * Display a list of visit logs.
     */
  // app/Http/Controllers/OperationsController.php

  public function indexVisits(Request $request)
  {
      $branchID = $request->query('branchID'); 
  
      // Eager-load the related Member and Branch.
      // This ensures we can access $visit->member->FullName and $visit->branch->BranchName
      // without causing extra queries.
      $query = MemberVisit::with(['member', 'branch']);
  
      // If a branchID was provided, filter by it.
      if ($branchID) {
          $query->where('BranchID', $branchID);
      }
  
      // Sort by newest visit first (optional).
      $visits = $query->orderByDesc('VisitDate')->get();
  
      // Transform each visit so it includes a top-level "FullName", etc.
      // This is optional, but it prevents deeply nested JSON structure
      // and lets you control exactly which fields get returned.
      $transformedVisits = $visits->map(function ($visit) {
          return [
              'VisitID'       => $visit->VisitID,
              'MemberID'      => $visit->MemberID,
              'FullName'      => optional($visit->member)->FullName, // safely retrieve FullName
              'BranchID'      => $visit->BranchID,
              'BranchName'    => optional($visit->branch)->BranchName,
              'VisitDate'     => $visit->VisitDate,
              'VisitTime'     => $visit->VisitTime,
              'CheckInMethod' => $visit->CheckInMethod,
              'Remarks'       => $visit->Remarks,
          ];
      });
  
      // Return JSON with the flattened result
      return response()->json([
          'visits' => $transformedVisits
      ]);
  }
  

    /**
     * Update an existing visit log.
     */
    public function updateVisit(Request $request, $id)
    {
        $staff = auth('staff')->user();
        $visit = MemberVisit::findOrFail($id);

        if ($staff && $visit->BranchID != $staff->BranchID) {
            return response()->json(['message' => 'Cannot update a visit from another branch.'], 403);
        }

        $data = $request->validate([
            'MemberID'      => 'required|exists:members,MemberID',
            'VisitDate'     => 'required|date',
            'VisitTime'     => 'required',
            'CheckInMethod' => 'nullable|string|max:50',
            'Remarks'       => 'nullable|string',
            'BranchID'      => 'nullable|exists:branches,BranchID',
        ]);

        if ($staff) {
            $data['BranchID'] = $staff->BranchID;
        }

        $visit->update($data);

        return response()->json([
            'message' => 'Visit updated successfully.',
            'visit'   => $visit
        ]);
    }

    /**
     * Delete a visit log.
     */
    public function destroyVisit($id)
    {
        $staff = auth('staff')->user();
        $visit = MemberVisit::findOrFail($id);

        if ($staff && $visit->BranchID != $staff->BranchID) {
            return response()->json(['message' => 'Cannot delete a visit from another branch.'], 403);
        }

        $visit->delete();

        return response()->json([
            'message' => 'Visit deleted successfully.'
        ]);
    }
    
    public function historyVisits()
    {
        $visits = MemberVisit::orderBy('VisitTime', 'desc')
            ->take(50)
            ->get();

        return response()->json(['visits' => $visits]);
    }

    /* ------------------------------------------------------------------
     * WALK-INS
     * ------------------------------------------------------------------ */

    /**
     * Display a listing of Walk-In records.
     */
    public function indexWalkIns()
    {
        $staff = auth('staff')->user();
    
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $walkIns = WalkIn::whereIn('BranchID', $branchIDs)
                ->orderBy('WalkInID','desc')
                ->get();
        } else {
            $walkIns = WalkIn::orderBy('WalkInID','desc')->get();
        }
    
        return response()->json($walkIns);
    }

    /**
     * Show the form to create a new Walk-In record.
     */
    public function createWalkIn()
    {
        $staff = auth('staff')->user();
        $defaultBranchID = $staff ? $staff->BranchID : null;

        return Inertia::render('Operations/WalkIn/Create', [
            'defaultBranchID' => $defaultBranchID,
        ]);
    }

    /**
     * Store a new Walk-In record.
     */
    public function storeWalkIn(Request $request)
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();
    
        $data = $request->validate([
            'BranchID'      => 'nullable|exists:branches,BranchID',
            'FullName'      => 'nullable|string|max:255',
            'VisitDate'     => 'required|date',
            'Notes'         => 'nullable|string',
            'PaymentMethod' => 'nullable|string|max:50',
            'PaymentAmount' => 'nullable|numeric|min:0',
            'PaymentFor'    => 'nullable|string',
        ]);
    
        if ($staff) {
            // Use staff->BranchID if it exists; otherwise, fetch the first branch from the pivot.
            if (!empty($staff->BranchID)) {
                $data['BranchID'] = $staff->BranchID;
            } else {
                $branch = $staff->branches()->first();
                $data['BranchID'] = $branch ? $branch->BranchID : null;
            }
        } elseif ($admin || $owner) {
            if (empty($data['BranchID'])) {
                $data['BranchID'] = 1; 
            }
        }
    
        $branchID = $data['BranchID'] ?? null;
    
        if (!$branchID) {
            abort(422, 'No valid BranchID was set.');
        }
    
        $walkIn = WalkIn::create([
            'BranchID'  => $branchID,
            'FullName'  => $data['FullName'] ?? null,
            'VisitDate' => $data['VisitDate'],
            'Notes'     => $data['Notes'] ?? null,
        ]);
    
        if (!empty($data['PaymentMethod']) && !empty($data['PaymentAmount'])) {
            $paymentFor = ["Walk-In Payment"];
            if (!empty($data['PaymentFor'])) {
                $decoded = json_decode($data['PaymentFor'], true);
                if (is_array($decoded)) {
                    $paymentFor = $decoded;
                }
            }
    
            $payment = Payment::create([
                'BranchID'      => $branchID,
                'WalkInName'    => $data['FullName'] ?? 'Walk-In',
                'PaymentMethod' => $data['PaymentMethod'],
                'Amount'        => $data['PaymentAmount'],
                'PaymentFor'    => $paymentFor,
                'PaymentDate'   => now(),
                'Status'        => 'Completed',
            ]);
    
            $walkIn->PaymentID = $payment->PaymentID;
            $walkIn->save();
    
            // $this->updateDailyFlowForWalkIn(
            //     $branchID,
            //     $data['VisitDate'],
            //     $data['PaymentMethod'],
            //     $data['PaymentAmount']
            // );
        }
    
        return response()->json($walkIn, 201);
    }
    
    
    // /**
    //  * Increment the daily cash flow for a Walk-In.
    //  */
    // protected function updateDailyFlowForWalkIn($branchID, $visitDate, $method, $amount)
    // {
    //     if (!$branchID) {
    //         return;
    //     }

    //     $flow = DailyCashFlow::firstOrNew([
    //         'BranchID'     => $branchID,
    //         'Date'         => date('Y-m-d', strtotime($visitDate)),
    //         'BusinessType' => 'Gym',
    //     ]);

    //     $field = null;
    //     switch ($method) {
    //         case 'W-In Cash':
    //             $field = 'WalkInCashSales';
    //             break;
    //         case 'W-In GCash':
    //             $field = 'WalkInGCashSales';
    //             break;
    //         case 'W-In BPI':
    //             $field = 'WalkInBPISales';
    //             break;
    //         case 'W-In BDO':
    //             $field = 'WalkInBDOSales';
    //             break;
    //         default:
    //             $field = 'WalkInCashSales';
    //             break;
    //     }

    //     if ($field) {
    //         $existing = (float) $flow->{$field};
    //         $flow->{$field} = $existing + (float) $amount;
    //     }

    //     $flow->TotalSales = (
    //         (float) $flow->CashSales
    //         + (float) $flow->GCashSales
    //         + (float) $flow->BPISales
    //         + (float) $flow->BDOSales
    //         + (float) $flow->WalkInCashSales
    //         + (float) $flow->WalkInGCashSales
    //         + (float) $flow->WalkInBPISales
    //         + (float) $flow->WalkInBDOSales
    //     );

    //     $flow->save();
    // }

    /**
     * Show the edit form for an existing Walk-In.
     */
    public function editWalkIn($id)
    {
        $staff = auth('staff')->user();
        $walkIn = WalkIn::findOrFail($id);

        if ($staff && $walkIn->BranchID != $staff->BranchID) {
            abort(403, 'Cannot edit a walk-in from another branch.');
        }

        return Inertia::render('Operations/WalkIn/Edit', [
            'walkIn' => $walkIn
        ]);
    }

    /**
     * Update the specified Walk-In record.
     */
    public function updateWalkIn(Request $request, $id)
    {
        $staff = auth('staff')->user();
        $walkIn = WalkIn::findOrFail($id);

        if ($staff && $walkIn->BranchID != $staff->BranchID) {
            abort(403, 'Cannot update a walk-in from another branch.');
        }

        $data = $request->validate([
            'FullName'       => 'nullable|string|max:255',
            'VisitDate'      => 'required|date',
            'PaymentID'      => 'nullable|exists:payments,id',
            'PaymentMethod'  => 'nullable|string|max:50',
            'AmountPaid'     => 'numeric|min:0',
            'PaymentStatus'  => 'string|in:Pending,Completed,Failed',
            'Notes'          => 'nullable|string',
            'BranchID'       => 'nullable|exists:branches,BranchID',
        ]);

        if ($staff) {
            $data['BranchID'] = $staff->BranchID;
        }

        $walkIn->update($data);

        return redirect()
            ->route('operations.walkins.index')
            ->with('success','Walk-In updated.');
    }

    /**
     * Delete a Walk-In record.
     */
    public function destroyWalkIn($id)
    {
        $staff = auth('staff')->user();
        $walkIn = WalkIn::findOrFail($id);
        $walkIn->delete();

        return redirect()
            ->route('operations.walkins.index')
            ->with('success','Walk-In record deleted.');
    }
}