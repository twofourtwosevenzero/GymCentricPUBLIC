<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    /**
     * Display the specified member.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $member = Member::with(['plan', 'status', 'visits' => function($query) {
            $query->latest()->take(5);
        }])->findOrFail($id);

        return response()->json($member);
    }
} 