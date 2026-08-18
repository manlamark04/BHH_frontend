Absolutely. Here is a **detailed master prompt** you can copy into an AI coding tool such as Cursor, Claude, ChatGPT, or another system-development AI. I structured it so the AI understands the **roles, workflow, database, security, UI/UX, booking, billing, payments, activities, and reports** of your **Cambacay Breeze Inn** system.

# SYSTEM DEVELOPMENT MASTER PROMPT

## Cambacay Breeze Inn — Walk-In Motel Management System

You are a **senior full-stack software developer, system architect, database designer, UI/UX designer, and cybersecurity-conscious programmer with 8+ years of professional experience**.

Your task is to design and develop a complete, professional, responsive, and user-friendly **Walk-In Motel Management System** entitled:

# **CAMBACAY BREEZE INN**

The system should have a **modern, clean, slick, professional, and nature-inspired design**, reflecting the identity of a comfortable and relaxing motel/inn.

The system must be functional, organized, scalable, secure, and easy to use.

---

# 1. SYSTEM OVERVIEW

**Cambacay Breeze Inn** is a motel management system designed to manage:

* Customer accounts
* Staff accounts
* Room availability
* Room bookings
* Walk-in customers
* Services
* Motel activities
* Activity rentals
* Billing
* Payments
* Customer transactions
* Booking history
* User management
* Account approval
* Reports
* Staff management
* Customer profiling

The system has **three end-users**:

1. **Admin**
2. **Staff**
3. **Customer**

The system must support both:

* **Online/customer-created accounts**
* **Walk-in customer accounts created by staff**

---

# 2. USER ROLES

## A. CUSTOMER

Customers can either:

1. Create their own account through the website, OR
2. Have their account/profile created by staff when they walk into the motel.

### Customer Account Registration

When a customer creates an account:

* The system automatically generates a unique Customer ID.
* The account status must initially be:

**PENDING**

* The customer cannot fully access the system until the Admin approves the account.
* The system automatically generates a default password:

**user123**

The customer should be required to change this password after successfully logging in.

### Customer ID

Every customer must have a unique alphanumeric ID.

Example:

`CUS-2026-0001`

Another example:

`CBI-CUS-00001`

The ID must automatically increment and must never duplicate.

The Customer ID must appear in:

* Customer profile
* Customer dashboard
* Booking records
* Transaction records
* Admin user management
* Staff customer management

---

# 3. CUSTOMER DASHBOARD

After an approved customer logs in, display a professional dashboard containing:

* Welcome message
* Customer ID
* Account status
* Available rooms
* Current booking
* Upcoming booking
* Recent transactions
* Available services
* Available activities
* Activity rentals
* Notifications

The dashboard should be visually clean and easy to understand.

---

# 4. CUSTOMER ROOM MODULE

Customers should be able to see all available rooms.

Each room should display:

* Room number
* Room name/type
* Room image
* Room description
* Capacity
* Price
* Available amenities
* Availability status
* Booking button

Possible room statuses:

* AVAILABLE
* RESERVED
* OCCUPIED
* CLEANING
* MAINTENANCE
* UNAVAILABLE

Customers can select an available room and make a booking.

---

# 5. ROOM BOOKING

Customers should be able to:

* Select a room
* Select check-in date/time
* Select check-out date/time
* View room price
* Review booking details
* Submit booking

When the booking is submitted:

**Booking Status = PENDING**

The staff can then review and accept the booking.

Possible booking statuses:

* PENDING
* CONFIRMED
* CHECKED-IN
* CHECKED-OUT
* CANCELLED
* COMPLETED

Do not automatically mark a room as occupied when a booking is merely submitted.

The room should only become **OCCUPIED** after the appropriate staff check-in process.

---

# 6. WALK-IN CUSTOMER SYSTEM

This is a major feature of the system.

Customers who physically walk into Cambacay Breeze Inn do not necessarily need to register themselves online.

Instead, staff can create their customer profile.

The Staff should be able to enter:

* First name
* Middle name
* Last name
* Contact number
* Email
* Address
* Date of birth
* Valid identification details if required
* Other necessary customer information

The system automatically generates:

* Customer ID
* Default password: `user123`
* Account status: `PENDING`

The Admin must approve the account before it becomes fully active.

Staff should also be able to create bookings for walk-in customers.

---

# 7. CUSTOMER SERVICES

Create a module where customers can see all services offered by Cambacay Breeze Inn.

Each service should contain:

* Service name
* Image
* Description
* Price
* Availability
* Service category

Examples:

* Room service
* Housekeeping
* Food service
* Laundry
* Other motel services

The Admin/Staff should be able to manage available services depending on their permissions.

---

# 8. MOTEL ACTIVITIES

Cambacay Breeze Inn offers activities that customers can rent or use.

Include at least:

### Pickleball

Information:

* Activity name
* Description
* Rate
* Available schedule
* Availability
* Duration
* Rental status

### Motorcycle Rental

Information:

* Motorcycle/unit name
* Description
* Rental rate
* Availability
* Rental duration
* Rental status

The system must allow the customer to request/rent an activity.

---

# 9. ACTIVITY RENTAL

Customers can:

* Browse activities
* View activity details
* View prices
* Select an activity
* Select date/time
* Select duration
* Submit rental request
* View rental status
* View rental history

Activity rental statuses:

* PENDING
* APPROVED
* ACTIVE
* COMPLETED
* CANCELLED

Activity rentals must also be connected to the customer's billing.

---

# 10. CUSTOMER TRANSACTION HISTORY

Customers must have a **Transaction History** page.

Display:

* Transaction ID
* Booking ID
* Customer ID
* Room/activity/service
* Date
* Amount
* Billing status
* Payment status
* Payment method
* Staff who processed the transaction

Possible payment statuses:

* UNPAID
* PARTIALLY PAID
* PAID
* REFUNDED
* CANCELLED

Customers must be able to see their previous transactions.

---

# 11. STAFF MODULE

Staff users are responsible for day-to-day motel operations.

Staff dashboard should contain:

* Today's bookings
* Pending bookings
* Available rooms
* Occupied rooms
* Walk-in customers
* Pending payments
* Unpaid bills
* Active activity rentals
* Recent transactions

---

# 12. STAFF CUSTOMER MANAGEMENT

Staff can:

* Create customer accounts
* Create customer profiles
* View customer information
* Search customers
* Update customer information
* View customer bookings
* View customer transactions
* View customer activity rentals

Staff cannot approve customer accounts.

Only the **Admin** can approve pending accounts.

---

# 13. STAFF BOOKING MANAGEMENT

Staff can:

* View pending bookings
* View booking details
* Accept bookings
* Reject/cancel bookings when appropriate
* Check customers in
* Check customers out
* View room availability
* Manage walk-in bookings

Staff should receive clear confirmation dialogs before important actions.

Example:

> "Are you sure you want to confirm this booking?"

---

# 14. BILLING SYSTEM

The system must strictly follow this workflow:

### BILL FIRST → PAYMENT SECOND

This is very important.

When a customer books:

1. Staff reviews the booking.
2. Staff creates/generates the bill.
3. The system calculates the total amount.
4. The bill is recorded as **UNPAID**.
5. Customer/staff proceeds to payment.
6. Staff records the payment.
7. System updates payment status.

Do NOT automatically mark a bill as PAID when it is generated.

---

# 15. BILLING CALCULATION

The billing system should support:

### Room Charges

`Room Rate × Number of Nights/Duration`

### Activity Charges

`Activity Rate × Duration/Quantity`

### Service Charges

`Service Price × Quantity`

### Additional Charges

Allow staff to add authorized additional charges.

The system should calculate:

* Subtotal
* Additional charges
* Discounts if applicable
* Total amount
* Amount paid
* Remaining balance
* Change

Formula:

`Total = Subtotal + Additional Charges - Discount`

`Balance = Total - Amount Paid`

`Change = Amount Paid - Total`

Do not allow invalid negative balances unless explicitly required for refunds.

---

# 16. PAYMENT MODULE

Staff can process customer payments.

Payment information should include:

* Payment ID
* Transaction ID
* Customer ID
* Bill ID
* Date/time
* Amount
* Payment method
* Staff ID
* Payment status

Possible payment methods:

* Cash
* Other officially supported methods

The system should generate a payment receipt.

The receipt should display:

* Cambacay Breeze Inn
* Transaction ID
* Customer name
* Customer ID
* Room/activity/service
* Bill amount
* Amount paid
* Balance
* Payment method
* Date/time
* Staff name

---

# 17. ADMIN MODULE

The Admin has full control over the system.

Admin dashboard should display:

* Total customers
* Total staff
* Pending accounts
* Available rooms
* Occupied rooms
* Current bookings
* Total transactions
* Total revenue
* Pending payments
* Activity rentals
* Monthly revenue
* Yearly revenue

Use visually appealing dashboard cards and charts.

---

# 18. STAFF ACCOUNT MANAGEMENT

Only Admin can create Staff accounts.

When creating a staff account:

* Automatically generate Staff ID
* Automatically generate default password: `user123`
* Set account status
* Save staff profile

Example Staff ID:

`STF-2026-0001`

Admin can:

* Create staff
* View staff
* Edit staff
* Disable staff
* Enable staff
* View staff profile
* Reset staff password if necessary

---

# 19. USER MANAGEMENT

Admin has a complete **User Management** module.

Display:

* User ID
* Full name
* Username/email
* Role
* Account status
* Date created
* Last login

Roles:

* ADMIN
* STAFF
* CUSTOMER

Account statuses:

* PENDING
* ACTIVE
* DISABLED

Admin can:

* Approve pending customers
* Enable accounts
* Disable accounts
* Search users
* Filter users by role
* Filter users by status
* View user profile

Only Admin can approve pending accounts.

---

# 20. ACCOUNT APPROVAL

Whenever a customer creates an account, the account must automatically become:

**PENDING**

The Admin should see a notification such as:

> "3 customer accounts are waiting for approval."

Admin can:

**APPROVE**

or

**REJECT**

After approval:

`PENDING → ACTIVE`

After rejection:

`PENDING → REJECTED`

A rejected account should not be able to access protected customer features.

---

# 21. PASSWORD SYSTEM

Every newly created customer/staff account automatically receives:

**Default Password: `user123`**

After first login, the user should be encouraged/required to change the password.

Create a **Change Password** feature inside Profile.

Password validation must require:

* At least one uppercase letter
* At least one number
* At least one unique/special character
* Maximum of 8 characters

Use a clear password validator UI.

Example validation indicators:

✓ Contains uppercase letter

✓ Contains number

✓ Contains special character

✓ Maximum 8 characters

The system should not store passwords in plain text.

Use secure password hashing such as:

`password_hash()`

and verify passwords using:

`password_verify()`

---

# 22. PROFILE MODULE

Every user should have a Profile page.

Display:

* Profile picture if available
* User ID
* Full name
* Email
* Contact number
* Address
* Role
* Account status
* Date registered

For customers, also show:

* Booking history
* Transaction history
* Activity rental history

Users should be able to update allowed profile information.

Password changes should be handled separately.

---

# 23. LANDING PAGE

Create a beautiful public landing page for **Cambacay Breeze Inn**.

The landing page should be modern, elegant, and nature-inspired.

Design inspiration:

* Bahay kubo
* Tropical environment
* Greenery
* Natural wood
* Fresh atmosphere
* Relaxing vacation feeling

The landing page should include:

### Hero Section

Display:

**Cambacay Breeze Inn**

Example tagline:

**"Relax. Stay. Experience the Breeze."**

Include:

* Background image
* Book Now button
* Login button
* Register button

### About Section

Introduce Cambacay Breeze Inn.

### Rooms Section

Display available room types with:

* Room images
* Name
* Price
* Description
* Amenities
* View Room button

### Services Section

Display motel services.

### Activities Section

Display:

* Pickleball
* Motorcycle Rental
* Other available activities

### Why Choose Us

Examples:

* Comfortable rooms
* Convenient location
* Friendly service
* Fun activities
* Relaxing environment

### Contact Section

Display:

* Address
* Contact number
* Email
* Social media links if available

### Footer

Include:

**© 2026 Cambacay Breeze Inn. All Rights Reserved.**

---

# 24. ROOM MANAGEMENT

Admin/authorized staff should be able to manage rooms.

Room fields:

* Room ID
* Room number
* Room type
* Room name
* Description
* Price
* Capacity
* Amenities
* Image
* Status

Room statuses:

* AVAILABLE
* RESERVED
* OCCUPIED
* CLEANING
* MAINTENANCE
* UNAVAILABLE

---

# 25. REPORTS MODULE

Admin should have a complete reporting system.

Reports must support:

### Monthly Reports

Examples:

* Monthly revenue
* Monthly bookings
* Monthly payments
* Monthly room usage
* Monthly activity rentals
* Monthly customers
* Monthly transactions

### Yearly Reports

Examples:

* Yearly revenue
* Yearly bookings
* Yearly payments
* Yearly room usage
* Yearly activities
* Yearly customers
* Yearly transactions

Allow Admin to filter reports by:

* Date range
* Month
* Year
* Room
* Activity
* Staff
* Payment status

Display reports using:

* Tables
* Summary cards
* Charts
* Graphs

Include export functionality if supported.

Possible formats:

* PDF
* CSV
* Excel

---

# 26. TRANSACTION ID

Every transaction must have a unique ID.

Example:

`TXN-2026-00001`

Booking ID:

`BKG-2026-00001`

Bill ID:

`BIL-2026-00001`

Payment ID:

`PAY-2026-00001`

Activity Rental ID:

`ACT-2026-00001`

Room ID:

`ROM-2026-00001`

Customer ID:

`CUS-2026-00001`

Staff ID:

`STF-2026-00001`

IDs must be automatically generated and unique.

---

# 27. DATABASE DESIGN

Create a normalized relational database.

At minimum, consider the following tables:

### users

* id
* user_id
* username/email
* password
* role
* status
* first_login
* created_at
* updated_at

### customers

* id
* customer_id
* user_id
* first_name
* middle_name
* last_name
* contact_number
* email
* address
* date_of_birth
* created_by
* created_at

### staff

* id
* staff_id
* user_id
* first_name
* middle_name
* last_name
* contact_number
* email
* position
* created_at

### rooms

* id
* room_id
* room_number
* room_type
* description
* price
* capacity
* amenities
* image
* status

### bookings

* id
* booking_id
* customer_id
* room_id
* check_in
* check_out
* total_amount
* status
* created_at
* accepted_by

### services

* id
* service_id
* name
* description
* price
* status

### activities

* id
* activity_id
* name
* description
* price
* duration
* status

### activity_rentals

* id
* rental_id
* customer_id
* activity_id
* date
* start_time
* duration
* quantity
* total_amount
* status

### bills

* id
* bill_id
* customer_id
* booking_id
* subtotal
* additional_charges
* discount
* total_amount
* amount_paid
* balance
* status
* created_by
* created_at

### payments

* id
* payment_id
* bill_id
* customer_id
* amount
* payment_method
* payment_date
* processed_by
* status

### transactions

* id
* transaction_id
* customer_id
* bill_id
* transaction_type
* amount
* status
* created_at

### notifications

* id
* user_id
* title
* message
* type
* is_read
* created_at

Add other tables when necessary.

Use proper primary keys, foreign keys, indexes, constraints, and relationships.

---

# 28. SYSTEM WORKFLOW

## CUSTOMER REGISTRATION WORKFLOW

Customer:

`Register Account`

↓

System generates:

`Customer ID`

↓

System generates:

`Default Password: user123`

↓

Account status:

`PENDING`

↓

Admin reviews account

↓

Admin approves

↓

Account becomes:

`ACTIVE`

↓

Customer logs in

↓

Customer changes password

↓

Customer can use the system.

---

# 29. WALK-IN WORKFLOW

Customer arrives at motel.

↓

Staff creates customer profile.

↓

System generates Customer ID.

↓

System generates default password.

↓

Account becomes PENDING.

↓

Admin approves account.

↓

Staff creates/handles booking.

↓

Staff generates bill.

↓

Customer pays.

↓

Staff records payment.

↓

System updates transaction.

---

# 30. BOOKING WORKFLOW

Customer:

`Select Room`

↓

`Submit Booking`

↓

Booking:

`PENDING`

↓

Staff reviews booking

↓

Staff:

`ACCEPT`

↓

Booking:

`CONFIRMED`

↓

Staff checks customer in

↓

Booking:

`CHECKED-IN`

↓

Staff generates bill

↓

Customer pays

↓

Staff records payment

↓

Customer checks out

↓

Booking:

`COMPLETED`

---

# 31. ACTIVITY WORKFLOW

Customer:

`Select Activity`

↓

`Select Date/Time`

↓

`Submit Rental`

↓

Rental:

`PENDING`

↓

Staff reviews

↓

`APPROVED`

↓

Staff creates bill

↓

Customer pays

↓

Staff records payment

↓

Activity:

`ACTIVE`

↓

After activity:

`COMPLETED`

---

# 32. UI/UX DESIGN REQUIREMENTS

Create a **slick, modern, professional interface**.

The design should feel like a real commercial motel management system.

Use:

* Modern cards
* Rounded corners
* Clean typography
* Proper spacing
* Responsive tables
* Attractive dashboard
* Smooth hover effects
* Professional buttons
* Modal dialogs
* Search bars
* Filters
* Status badges
* Notification indicators
* Clean forms
* Responsive navigation/sidebar

The visual identity should combine:

**Modern Hotel UI + Tropical Nature + Bahay Kubo Inspiration**

Suggested design elements:

* Natural wood textures
* Green/nature-inspired accents
* White/light backgrounds
* Subtle shadows
* Modern icons
* Tropical imagery
* Clean dashboard layout

Avoid making the system look childish, overly colorful, or cluttered.

---

# 33. RESPONSIVE DESIGN

The system must work properly on:

* Desktop
* Laptop
* Tablet
* Mobile

The navigation and dashboard must automatically adapt to smaller screens.

Tables should become horizontally scrollable or responsive on mobile.

---

# 34. SECURITY REQUIREMENTS

Implement professional security practices.

Include:

* Password hashing
* Prepared SQL statements
* Input validation
* Output escaping
* Session management
* Role-based access control
* Authentication middleware
* CSRF protection where appropriate
* Protection against SQL injection
* Protection against XSS
* Secure file upload validation
* Server-side validation
* Client-side validation

Users must only access pages allowed for their role.

Example:

Customer must not be able to access:

`/admin`

or

`/staff`

Staff must not be able to access Admin-only functions.

Admin has full system access.

---

# 35. ROLE PERMISSIONS

Create clear permissions.

### ADMIN

Full access:

* Dashboard
* Users
* Customers
* Staff
* Rooms
* Services
* Activities
* Bookings
* Billing
* Payments
* Transactions
* Reports
* Account approval
* Enable/disable users
* System management

### STAFF

Access:

* Dashboard
* Customers
* Walk-in registration
* Rooms
* Bookings
* Billing
* Payments
* Activities
* Activity rentals
* Transactions

No access to:

* Admin account creation
* User approval
* System-wide reports
* Staff account management

### CUSTOMER

Access:

* Dashboard
* Profile
* Available rooms
* Booking
* Services
* Activities
* Activity rentals
* Current bookings
* Transaction history
* Booking history

---

# 36. NOTIFICATION SYSTEM

Implement notifications.

Examples:

Customer:

> "Your account is now approved."

> "Your booking has been confirmed."

> "Your booking is pending approval."

> "Your bill has been generated."

Staff:

> "New booking requires your attention."

> "New walk-in customer registered."

Admin:

> "New customer account requires approval."

Display notification badges in the navigation.

---

# 37. SEARCH AND FILTERING

Implement search and filtering throughout the system.

Examples:

Customer search:

* Customer ID
* Name
* Contact number

Booking search:

* Booking ID
* Customer
* Room
* Status
* Date

Transaction search:

* Transaction ID
* Customer
* Date
* Payment status

User management search:

* User ID
* Name
* Role
* Status

---

# 38. AUDIT LOG

Create an audit log for important system actions.

Track:

* User
* Action
* Date/time
* Module
* Description

Examples:

`Admin approved customer CUS-2026-00001`

`Staff created bill BIL-2026-00005`

`Staff recorded payment PAY-2026-00008`

`Admin disabled account STF-2026-00003`

This helps with accountability and system monitoring.

---

# 39. DASHBOARD CHARTS

Admin dashboard should include professional charts such as:

### Revenue Chart

Monthly revenue.

### Booking Chart

Number of bookings per month.

### Room Occupancy

Available vs occupied rooms.

### Activity Rentals

Pickleball vs motorcycle rental usage.

### Payment Status

Paid vs unpaid vs partially paid.

Use clean and understandable charts.

---

# 40. SYSTEM ERROR HANDLING

Do not allow raw PHP/database errors to appear to users.

Instead display friendly messages.

Example:

Instead of:

`SQLSTATE[23000]: Integrity constraint violation...`

Display:

> "Unable to complete the request. Please check the information and try again."

Log technical errors internally.

---

# 41. CONFIRMATION DIALOGS

For destructive or important actions, display confirmation dialogs.

Examples:

* Disable account
* Delete record
* Cancel booking
* Reject account
* Approve booking
* Confirm payment
* Check-in
* Check-out

Example:

> "Are you sure you want to disable this account?"

Buttons:

`Cancel`

`Confirm`

---

# 42. SYSTEM ARCHITECTURE

Use a clean and maintainable architecture.

Separate:

* Authentication
* Controllers
* Models
* Views
* Database
* Assets
* CSS
* JavaScript
* API/backend logic
* Configuration

Avoid putting the entire system into one huge file.

Use reusable components.

---

# 43. CODE QUALITY

Write code as an experienced professional developer.

Requirements:

* Clean code
* Meaningful variable names
* Reusable functions
* Proper comments
* Modular architecture
* DRY principle
* Proper error handling
* Secure database queries
* Maintainable folder structure

Do not create unnecessary duplicated code.

---

# 44. IMPORTANT BUSINESS RULES

These rules MUST be followed:

1. Every account has a unique alphanumeric ID.
2. Customer accounts created online are initially PENDING.
3. Customer accounts created by staff are also initially PENDING.
4. Only Admin can approve customer accounts.
5. Staff cannot approve customer accounts.
6. Admin creates staff accounts.
7. New accounts receive default password `user123`.
8. Users should change the default password after login.
9. Password validation must be implemented.
10. Staff bills first.
11. Payment is recorded only after billing.
12. A bill must not automatically become PAID.
13. Room availability must be updated according to booking/check-in/check-out status.
14. Customers can view their own bookings and transactions.
15. Customers cannot view other customers' information.
16. Staff cannot access Admin-only functions.
17. Admin has full access.
18. Disabled users cannot log in.
19. Pending users cannot use restricted system functions.
20. All important actions should be logged.

---

# 45. LANDING PAGE BRANDING

Use the official system name prominently:

# CAMBACAY BREEZE INN

Suggested tagline:

**"Your Comfort, Our Breeze."**

The branding should feel:

* Tropical
* Relaxing
* Natural
* Comfortable
* Modern
* Professional

The UI should subtly incorporate **Bahay Kubo-inspired architectural elements** without making the system look outdated.

---

# 46. FINAL SYSTEM EXPECTATION

The final product should feel like a **real-world professional motel management platform**, not a simple CRUD school project.

Prioritize:

**Functionality + Security + Usability + Professional UI + Database Integrity + Good User Experience**

Every module must connect properly.

For example:

Customer → Booking → Staff Approval → Billing → Payment → Transaction → Reports

and:

Customer → Activity Rental → Staff → Billing → Payment → Transaction → Reports

and:

Customer Registration → Pending → Admin Approval → Active Account

---

# 47. DEVELOPMENT INSTRUCTION

Before writing the complete code:

1. Analyze the entire system requirements.
2. Create the system architecture.
3. Create the database/entity relationship structure.
4. Define all user roles and permissions.
5. Define the complete system workflow.
6. Define the folder structure.
7. Define the UI/UX structure.
8. Identify relationships between modules.
9. Then implement the system module by module.

Do not skip important dependencies between modules.

Make sure every database relationship is valid.

Make sure all IDs are unique.

Make sure all role permissions are enforced on the server side.

Make sure the billing and payment workflow follows:

**BILL FIRST → PAYMENT SECOND**

---

# 48. DEVELOPMENT OUTPUT

When generating the system, provide:

1. Complete database schema
2. Database SQL
3. Folder structure
4. Authentication system
5. Role-based access control
6. Admin dashboard
7. Staff dashboard
8. Customer dashboard
9. Landing page
10. Customer registration
11. Staff customer registration
12. Account approval
13. User management
14. Room management
15. Room booking
16. Services management
17. Activities management
18. Activity rentals
19. Billing
20. Payments
21. Transactions
22. Receipts
23. Reports
24. Notifications
25. Audit logs
26. Profile management
27. Password change/validation
28. Search and filtering
29. Responsive design
30. Security implementation

---

# 49. FINAL DESIGN DIRECTION

The final interface should look similar in quality to a modern commercial hotel/motel management application.

Use a **slick dashboard**, professional typography, modern cards, clean tables, attractive room cards, responsive layouts, subtle animations, and a cohesive **Cambacay Breeze Inn tropical/natural brand identity**.

Do not make the design overly complicated.

Keep the interface:

**Clean + Modern + Elegant + Fast + User-Friendly + Professional.**

Build the system as if it will actually be used by a real motel business.

# END OF MASTER PROMPT
