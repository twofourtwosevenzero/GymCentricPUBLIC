<!DOCTYPE html>
<html>
<head>
    <title>GymCentric</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <!-- Add the meta viewport tag -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link rel="icon" href="{{ asset('favicon.ico') }}" type="image/x-icon">

    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
</head>
<body>
    @inertia
</body>
</html>
