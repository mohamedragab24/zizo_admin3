# لوحة إدارة صالون الحلاقة — Node.js + Firebase على Vercel

- الواجهة: React + Vite (تتبني إلى `dist/public`)
- السيرفر: Express داخل Vercel Function (`api/index.ts`)
- قاعدة البيانات: Firestore (مشروع `understand-me-d31f4`)
- تسجيل دخول المدير: Firebase Authentication (Google أو بريد/كلمة مرور)
- تم حذف كل خدمات Manus (OAuth، MySQL/Drizzle، التخزين، LLM، الخرائط، debug collector)

## الإعداد (مرة واحدة)
1. Firebase Console → Build → **Firestore Database** → Create database.
2. Build → **Authentication** → Sign-in method: فعّل Google و/أو Email/Password. من Settings → Authorized domains أضف دومين Vercel.
3. Project settings → Service accounts → **Generate new private key**، وانسخ محتوى الـ JSON.
4. Vercel → Project → Settings → Environment Variables:
   - `FIREBASE_SERVICE_ACCOUNT` = محتوى الـ JSON كامل
   - `ADMIN_EMAILS` = إيميل المدير (دخول Google)، أو `ADMIN_UIDS` = الـ UID من Authentication → Users
5. انشر قواعد Firestore من `firestore.rules` (تمنع أي وصول مباشر من المتصفح؛ كل شيء عبر السيرفر).
6. ارفع المجلد إلى GitHub واستورده في Vercel (Build: `npm run build`، Output: `dist/public` — مضبوطين في `vercel.json`).

## تشغيل محلي
```
npm install
cp .env.example .env   # واملأه
npm run dev:api        # السيرفر :3001
npm run dev:web        # الواجهة :3000
```

## مسارات الـ API
- عامة (تطبيق Flutter): `GET /api/mobile/bootstrap` · `POST /api/mobile/discounts/validate` · `POST /api/mobile/bookings`
- للمدير (Bearer Firebase ID token): `GET/PUT /api/admin/salon`

مجموعات Firestore: `services`, `customers`, `discounts`, `bookings`, `settings/main` (تُنشأ تلقائيًا مع الخدمات الافتراضية عند أول طلب).

لا ترفع ملف Service Account أو `.env` إلى GitHub.
