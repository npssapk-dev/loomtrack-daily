# LoomTrack Daily

Build a new full-stack web/mobile-responsive application called LoomTrack based on this simple V1 requirement. This is for a small powerloom manufacturing operation. Keep it extremely simple, fast for daily entry, and practical on both phone and desktop. Do NOT add advanced OEE, downtime, maintenance, production planning, IoT, or complex ERP features in V1.

V1 modules:
1. Dashboard
2. Daily Production
3. Employees & Auto Wage
4. Income
5. Expenses
6. Machines
7. Products
8. Customers
9. Sales & Delivery
10. Reports
11. Basic Settings

DAILY PRODUCTION:
Fields: Production Date, Machine, Product, Employee, Quantity, Piece Rate, Calculated Wage, Remarks. Machine/Product/Employee should be dropdowns from masters. When Product/Employee/quantity is selected, calculate wage automatically using the configured piece-rate. Allow rate override only if needed. Save daily production. Provide today's entries and simple edit/delete actions.

EMPLOYEES & AUTO WAGE:
Employee master: Name, Phone, Join Date, Active/Inactive. Show employee production quantity, calculated wages, employee-linked expenses/advances, amount paid where relevant, and wage balance. Wage should primarily derive automatically from production entries rather than requiring duplicate manual wage entry.

EXPENSES — IMPORTANT:
Use ONE simple Expense screen with two expense types:
A) Employee Expense — employee selection is REQUIRED. Categories initially: Salary Payment, Advance, Medical, Travel, Loan/Recovery, Other Employee Expense.
B) General Expense — employee should be blank/not required. Categories initially: Electricity, Rent, Food, Bank EMI, Repairs, Transport, Other.
Fields: Date, Expense Type, Category, Employee (conditional), Amount, Payment Method optional, Remarks. Validate that Employee Expense cannot save without an employee. General Expense must not be attributed to an employee.

INCOME:
Simple income entry: Date, Income Type (Sales / Other Income), Customer optional, Amount, Payment Method optional, Reference, Remarks. Sales generated from delivery can optionally create/link an income entry to avoid double entry; keep implementation simple and understandable.

MACHINES:
Machine master: Machine Name/Number, Active/Inactive. Provide machine-wise production totals in reports.

PRODUCTS:
Product master: Product Name, Product Code unique, Default Piece Rate, Unit, Active/Inactive. This default rate should feed production wage calculation.

CUSTOMERS:
Customer master: Name, Phone, Address optional, Active/Inactive.

SALES & DELIVERY:
Fields: Delivery Date, Customer, Product, Delivered Quantity, Approved Quantity, Rejected Quantity, Rate/Unit Price, Bill Amount auto-calculated from approved quantity × rate, Status, Remarks. Validation: approved + rejected should not exceed delivered quantity. Statuses: Draft, Delivered, Partially Approved, Approved, Rejected, Paid. Keep customer/product dropdowns from masters.

DASHBOARD:
Make this clean and very simple. Top KPI cards: Today's Production Qty, Today's Calculated Wages, Today's Income, Today's Expenses. Also show this month's Income, Expenses and Net (Income - Expenses). Below show Machine-wise Today's Production, Employee-wise Today's Production/Wage, Recent Production Entries, and Recent Sales/Deliveries. Add quick action buttons: Add Production, Add Expense, Add Income, Add Delivery.

REPORTS:
Create simple filterable reports with From Date and To Date and optional relevant master filters. Reports required:
- Production Report: date/machine/product/employee/quantity/wage
- Employee Wage Report: employee, production qty, calculated wage, employee expenses/advances/payments, wage balance
- Income Report
- Expense Report with Employee Expense vs General Expense distinction
- Machine-wise Production Report
- Sales & Delivery Report: customer/product/delivered/approved/rejected/bill amount/status
- Simple Profit Summary: Income - Expenses for selected period
Provide CSV export where practical.

DATA MODEL:
Use the default Lovable backend/database. Suggested entities: profiles/auth, machines, products, employees, customers, production_entries, expenses, income_entries, deliveries. Keep relationships straightforward. Expense employee_id must be nullable for general expenses but required by application validation for Employee Expense. production_entries should retain the applied piece_rate and calculated_wage so historical wage calculation doesn't change if product rate changes later. Deliveries should retain rate and calculated bill_amount.

UI/UX:
Mobile-first but polished on desktop. Simple left navigation on desktop and usable mobile navigation. Use large touch-friendly controls. Daily Production should be the fastest screen because it will be used frequently. Use searchable dropdowns where useful. Show success/error messages clearly. Use a clean professional textile/manufacturing visual style without unnecessary decoration. Seed realistic sample data so all dashboard/reports can be tested immediately.

AUTH:
Add basic login/authentication if supported by the default stack. V1 can use one admin/owner role; don't build complex permissions yet.

BUSINESS FLOW:
Login -> Dashboard -> Daily Production -> automatic wage calculation -> Income/Expenses -> Sales & Delivery -> Reports.

Build the working V1, not just a mockup. Use persistent backend data where supported. Include sensible validation, responsive screens, navigation, and sample records.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/933cd654-353d-4a6a-94b1-121a15583082).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
