<?php

return [

    'defaults' => [
        'guard' => 'web',     // you can keep the default "web" or set one of the new ones
        'passwords' => 'users',
    ],

    'guards' => [
        // (Optionally keep the default "web" for something else)
        
        'owner' => [
            'driver'   => 'session',
            'provider' => 'owners',
        ],

        'admin' => [
            'driver'   => 'session',
            'provider' => 'admins',
        ],

        'staff' => [
            'driver'   => 'session',
            'provider' => 'staffs', // notice the name, see below in "providers"
        ],
        'member' => [
            'driver'   => 'session',
            'provider' => 'members',
        ],
    ],

    'providers' => [
        // each "provider" references a table & model
        'owners' => [
            'driver' => 'eloquent',
            'model'  => App\Models\Owner::class,
        ],

        'admins' => [
            'driver' => 'eloquent',
            'model'  => App\Models\Admin::class,
        ],

        'staffs' => [
            'driver' => 'eloquent',
            'model'  => App\Models\Staff::class,
        ],
        'members' => [
            'driver' => 'eloquent',
            'model'  => App\Models\Member::class, // update to your actual model path
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resetting Passwords
    |--------------------------------------------------------------------------
    |
    | These configuration options specify the behavior of Laravel's password
    | reset functionality, including the table utilized for token storage
    | and the user provider that is invoked to actually retrieve users.
    |
    | The expiry time is the number of minutes that each reset token will be
    | considered valid. This security feature keeps tokens short-lived so
    | they have less time to be guessed. You may change this as needed.
    |
    | The throttle setting is the number of seconds a user must wait before
    | generating more password reset tokens. This prevents the user from
    | quickly generating a very large amount of password reset tokens.
    |
    */

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => env('AUTH_PASSWORD_RESET_TOKEN_TABLE', 'password_reset_tokens'),
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Password Confirmation Timeout
    |--------------------------------------------------------------------------
    |
    | Here you may define the amount of seconds before a password confirmation
    | window expires and users are asked to re-enter their password via the
    | confirmation screen. By default, the timeout lasts for three hours.
    |
    */

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
