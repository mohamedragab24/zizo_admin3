# إعداد Firebase للوحة التحكم

إعداد الواجهة الأمامية موجود على مشروع `understand-me-d31f4` بالفعل، وتستخدم الواجهة Firebase Authentication. ويستخدم الخادم Firebase Admin SDK لقراءة/كتابة Firestore.

## متغيرات Vercel المطلوبة
- `FIREBASE_SERVICE_ACCOUNT`: JSON كامل لحساب خدمة تم إنشاؤه من مشروع Firebase `understand-me-d31f4` (خزّنه في Environment Variables فقط، لا ترفعه إلى GitHub).
- `ADMIN_EMAILS`: بريد المدير/المديرين المسموح لهم بالدخول، أو `ADMIN_UIDS` لمعرفات المستخدمين.
- `VITE_FIREBASE_API_KEY=AIzaSyAnFMpP6gppJ_sSuzRb5eZDGu98-J7pPGg`
- `VITE_FIREBASE_AUTH_DOMAIN=understand-me-d31f4.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID=understand-me-d31f4`
- `VITE_FIREBASE_STORAGE_BUCKET=understand-me-d31f4.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=2843068379`
- `VITE_FIREBASE_APP_ID=1:2843068379:web:bb4370ded94d65342349fe`
- `VITE_FIREBASE_MEASUREMENT_ID=G-7R57EV9KDZ`

بعد ضبط المتغيرات، أعد نشر Vercel. لا تستخدم ملف إعدادات الويب بدل حساب الخدمة؛ إعدادات الويب ليست بيانات اعتماد الخادم.
