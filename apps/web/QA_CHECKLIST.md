# Nexus ERP - QA Checklist

This document outlines the manual testing steps to ensure the integrity and correctness of the Nexus ERP system before final sign-off.

## ✅ Block 1: Authentication & User Roles

- [ ] **Test Case 1.1: Owner Login**
  - **Action:** Log in using the Owner's credentials.
  - **Expected Result:** Successful login. The user is redirected to the main dashboard and can see Owner-specific menus (e.g., User Management, Payroll Runs).

- [ ] **Test Case 1.2: Supervisor Login**
  - **Action:** Log in using a Supervisor's credentials.
  - **Expected Result:** Successful login. The user sees the dashboard but with limited access. Menus like "User Management" or "Finalize Payroll" should be hidden or disabled.

- [ ] **Test Case 1.3: Invalid Login**
  - **Action:** Attempt to log in with an incorrect email or password.
  - **Expected Result:** An appropriate error message (e.g., "Invalid credentials") is displayed. The user is not logged in.

- [ ] **Test Case 1.4: Logout**
  - **Action:** Click the "Logout" button from any page.
  - **Expected Result:** The user is successfully logged out and redirected to the Login page.

## ✅ Block 2: User Management (Owner Role)

- [ ] **Test Case 2.1: Invite New Supervisor**
  - **Action:** As an Owner, navigate to User Management and invite a new supervisor via email.
  - **Expected Result:** The new user appears in the user list with a "Pending" or "Invited" status. The invited person should receive an invitation.

- [ ] **Test Case 2.2: New Supervisor Activation**
  - **Action:** The newly invited supervisor uses the invitation link to set up their account and log in.
  - **Expected Result:** The supervisor can log in successfully. The user's status changes from "Pending" to "Active" in the Owner's user list.

## ✅ Block 3: Core Operations

- [ ] **Test Case 3.1: Log Worker Activity**
  - **Action:** As a Supervisor, log a new task for a worker (e.g., Mg Ba completed 10 units of "Weaving Task A").
  - **Expected Result:** The log is saved successfully. The `totalPay` should be automatically calculated (quantity * pricePerUnit).

- [ ] **Test Case 3.2: Inventory Update from Task**
  - **Action:** Check the inventory after logging the task in the previous step.
  - **Expected Result:** The stock for the corresponding `outputInventoryId` (e.g., "FABRIC-A") should increase by the quantity completed.

- [ ] **Test Case 3.3: Create Customer Order**
  - **Action:** Create a new order for a customer for a finished good (e.g., 5 yards of "FABRIC-A").
  - **Expected Result:** The order is created. The stock for "FABRIC-A" should decrease by 5.

## ✅ Block 4: Payroll Calculation (Owner Role)

- [ ] **Test Case 4.1: Add Deduction**
  - **Action:** Add a one-time deduction (e.g., an advance of 5000) for a worker.
  - **Expected Result:** The deduction is recorded for the correct worker.

- [ ] **Test Case 4.2: Run Payroll**
  - **Action:** Initiate a new payroll run for a specific date range that includes the worker logs and deductions.
  - **Expected Result:** A new payroll run is generated.

- [ ] **Test Case 4.3: Verify Payroll Calculation**
  - **Action:** Open the details of the generated payroll run.
  - **Expected Result:** The final payment for each worker should be correct: `(Sum of all totalPay from logs) - (Sum of all deductions)`.

- [ ] **Test Case 4.4: Finalize and Pay**
  - **Action:** Mark the payroll run as "Paid".
  - **Expected Result:** The status of the payroll run updates to "Paid". The associated worker logs should be marked as "processed" or "paid" to prevent them from being included in future payrolls.

## ✅ Block 5: General UI/UX

- [ ] **Test Case 5.1: Form Validation**
  - **Action:** Try to submit forms with empty required fields or invalid data (e.g., text in a number field).
  - **Expected Result:** Clear validation messages appear, and the form is not submitted.

- [ ] **Test Case 5.2: Styling & Consistency**
  - **Action:** Browse through all pages of the application.
  - **Expected Result:** The UI is consistent, with no broken layouts or missing styles. The custom font and scrollbar are applied correctly.