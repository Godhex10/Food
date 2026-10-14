# Commint Buka — demo guide

Frontend-only prototype of the online ordering and order management system.
No server and no internet needed (except for the Google font). Everything is saved in the browser.

## Pages

| Page | Who it's for | File |
|---|---|---|
| Customer website | Customers | `index.html` |
| Checkout | Customers | `checkout.html` |
| Order tracking | Customers | `order.html` |
| Branch dashboard | Branch staff | `staff.html` |
| Management dashboard | Management | `admin.html` |

## Demo logins

| Username | PIN | Access |
|---|---|---|
| `allen` | `1111` | Allen branch staff |
| `ikeja` | `2222` | Ikeja branch staff |
| `tunde` | `3333` | Staff with access to both branches |
| `manager` | `0000` | Management (both branches) |

## Suggested demo script (≈10 minutes)

Open these in **separate tabs of the same browser**:
1. `staff.html` → sign in as **allen**
2. `staff.html` → sign in as **ikeja** (use a second browser window so both sessions stay open)
3. `admin.html` → sign in as **manager**
4. `index.html` → the customer site

Then walk through the proposal's acceptance checks (section 13):

1. **Branch selection.** On the customer site, pick **Allen**. Add dishes with options, go to checkout, choose pickup or delivery (the fee depends on the area), and place the order.
2. **Order number and confirmation.** The tracking page shows the order number, Providus transfer details and the text messages the customer received.
3. **Routing.** The order appears only on the **Allen** dashboard, with a chime. The Ikeja dashboard never shows it.
4. **Automatic printing.** The virtual printer on the Allen dashboard prints the ticket by itself. Open the order and choose **Preview ticket** to see every field.
5. **Printer failure.** Switch the Allen printer **off** and place another order. The ticket waits as *pending*, then shows as *failed* after 20 seconds, while the order stays safe. Switch the printer back on and press **Retry**. Use **Reprint** to show the "REPRINT" stamp. No new order is created.
6. **Statuses and audit trail.** Press **Confirm payment & accept**, then **Start packing**. The customer's tracking page and texts update live. The order history shows each staff member and the time.
7. **Access control.** Signed in as Ikeja staff, open `staff.html?branch=allen`. Access is denied. Management sees both branches.
8. **Management.** Show the sales reports (daily, weekly or monthly; each branch or combined), best-sellers, branch comparison, Excel export, menu and price editing for one or both branches, staff accounts, the activity log and the delay alerts.
9. **High volume.** Management → **Rush test** → 30 orders. Watch them arrive on both branch dashboards. The result shows 0 lost, 0 misrouted and 0 duplicates.

**Before each demo:** Management → Settings → **Reset demo data**.

## What is simulated

| Real system | In this demo |
|---|---|
| Server and database | Browser storage (shared between tabs on one device only) |
| Cloud thermal printer | On-screen printer. "Print on this device" uses the real print dialog |
| SMS provider | Messages shown on the tracking page |
| Payment confirmation | Staff press "Confirm payment" after checking the Providus account |
| Secure login | Demo usernames and PINs |

Branch addresses, phone numbers, delivery fees, the bank account and the sample orders are placeholders.
