# KSB Retailer App Backend API Requirements

Source collection: `/Users/apple/Desktop/ksb-mobile-app-api.postman_collection.json`

Base URL from the mobile collection:
`https://ksb-net-backend-production.up.railway.app/api`

Live check result:
- `POST /api/auth/send-otp` on the collection base URL returned HTTP 200 with Angular HTML, not JSON.
- The app is wired to the mobile collection paths, but the deployed base URL appears to be serving the frontend shell. If there is a separate API host, update `EXPO_PUBLIC_API_BASE_URL` in `.env`.

The app calls backend endpoints through `src/services/*`. Backend errors are shown in-app through the shared toast handler in `src/services/toast.ts`.

Implemented from `ksb-mobile-app-api.postman_collection.json`:
- Auth: `POST /auth/send-otp`, `POST /auth/verify-otp`
- Masters: `GET /masters/customer-types`, `GET /masters/states`, `GET /dealers`
- Registration: `POST /retailer/register`
- Dashboard: `GET /retailer/dashboard`
- Wallets: `GET /wallets/slab`, `GET /wallets/booster`
- Invoices: `GET /invoices?search=&dealer_id=&status=&from_date=&to_date=&page=1&page_size=20`
- Redemptions: `POST /redemptions/preview`, `POST /redemptions`
- Schemes: `GET /scheme/current`, `GET /scheme/slabs`, `GET /scheme/boosters`
- Bank accounts in contract docs: `GET /bank-accounts`, `POST /bank-accounts`

OTP testing:
The send OTP response may include `otp`, `testing_otp`, `testingOtp`, or `testOtp`. The app shows it on the OTP screen as `Testing OTP: ####`.

Error handling:
- Axios response errors are normalized and shown as toast messages.
- HTML responses are treated as an API base URL/configuration error and shown in a toast.
- Read screens use live API responses only. If an endpoint fails or returns no data, the app shows a loading/empty state instead of placeholder values.
