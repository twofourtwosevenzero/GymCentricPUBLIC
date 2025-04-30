<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebAuthnController;
use App\Http\Controllers\MemberController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// WebAuthn routes have been moved to web.php to support sessions
// Route::prefix('webauthn')->group(function () {
//     // Registration routes
//     Route::post('/register/options', [WebAuthnController::class, 'generateRegistrationOptions']);
//     Route::post('/register', [WebAuthnController::class, 'verifyAndSaveRegistration']);
//     
//     // Authentication routes
//     Route::post('/authenticate/options', [WebAuthnController::class, 'generateAuthenticationOptions']);
//     Route::post('/authenticate', [WebAuthnController::class, 'verifyAuthentication']);
// });

// Member routes
Route::get('/members/{id}', [MemberController::class, 'show']); 