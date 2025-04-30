# GymCentric - Modern Gym Management System

## Overview

GymCentric is a comprehensive gym management system designed to streamline operations for fitness facilities of all sizes. Built with Laravel and modern web technologies, this application provides a powerful set of tools for managing memberships, staff, facilities, bookings, and finances.

## Features

- **Member Management**
  - Registration and profile management
  - Membership plans and renewals
  - Attendance tracking
  - Locker assignments
  
- **Staff and Coach Management**
  - Schedule management
  - Task assignments
  - Performance tracking
  - Payroll processing
  
- **Facility Operations**
  - Equipment maintenance logs
  - Branch management
  - Facility usage monitoring
  
- **Financial Management**
  - Payment processing
  - Invoice generation
  - Expense tracking
  - Financial reporting
  
- **Booking System**
  - Session scheduling
  - Waitlist management
  - Attendance tracking
  
- **Reporting and Analytics**
  - Membership statistics
  - Financial reports
  - Attendance patterns
  - Usage analytics

- **Communication**
  - Mailjet integration for email notifications
  - Semaphore integration for SMS alerts

## Technology Stack

- **Backend**: Laravel 10.x, PHP 8.2
- **Frontend**: Blade, Tailwind CSS, Alpine.js
- **Database**: MySQL
- **Authentication**: Laravel Fortify, WebAuthn for passwordless authentication
- **Messaging**: Mailjet (emails), Semaphore (SMS)
- **Future Integration**: Payment gateway integration (planned for future releases)

## Installation and Setup

1. Clone the repository
   ```
   git clone https://github.com/yourusername/gymcentric.git
   ```

2. Install dependencies
   ```
   composer install
   npm install
   ```

3. Configure environment
   ```
   cp .env.example .env
   php artisan key:generate
   ```

4. Run migrations and seeders
   ```
   php artisan migrate --seed
   ```

5. Build assets
   ```
   npm run build
   ```

6. Start the server
   ```
   php artisan serve
   ```

## Portfolio Notes

This project demonstrates:
- Complex relational database design
- Role-based access control
- Financial transaction processing
- Real-time notifications via email (Mailjet) and SMS (Semaphore)
- Responsive UI design
- Third-party API integrations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
