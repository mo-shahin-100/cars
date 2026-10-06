# وثيقة واجهات البرمجة (REST API Documentation)
## نظام إدارة ورشة ميكانيكا السيارات

---

## 1. المعايير العامة (General Standards)

- **Base URL:** `/api`
- **التوثيق وتمرير التوكن:** عبر الترويسة `Authorization: Bearer <JWT_TOKEN>`
- **صيغة البيانات:** `application/json` لجميع الطلبات والاستجابات ما عدا رفع الملفات (`multipart/form-data`)
- **بنية الاستجابة القياسية:**
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "تمت العملية بنجاح"
  }
  ```
- **بنية رسائل الخطأ:**
  ```json
  {
    "success": false,
    "error": "تفاصيل سبب الخطأ بالعربية",
    "code": "ERROR_CODE"
  }
  ```

---

## 2. المسارات البرمجية الرئيسية (API Endpoints)

### 2.1 المصادقة والمستخدمين (Auth & Users)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/auth/login` | `POST` | عام | تسجيل الدخول واستلام توكن JWT وبيانات المستخدم |
| `/auth/me` | `GET` | مصادق عليه | جلب بيانات المستخدم الحالي وصلاحياته |
| `/auth/change-password` | `POST` | مصادق عليه | تغيير كلمة المرور للمستخدم الحالي |
| `/users` | `GET` | `users.view` | جلب قائمة مستخدمي الورشة والفنيين |
| `/users` | `POST` | `users.manage` | إنشاء مستخدم أو ميكانيكي جديد وتحديد دوره |
| `/users/:id` | `PUT` | `users.manage` | تحديث بيانات المستخدم أو حالته (نشط/معطل) |

### 2.2 العملاء (Customers)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/customers` | `GET` | `customers.view` | جلب قائمة العملاء مع البحث بالاسم أو الهاتف |
| `/customers/:id` | `GET` | `customers.view` | ملف العميل الشامل وسياراته وفواتيره السابقة |
| `/customers` | `POST` | `customers.create` | إنشاء ملف عميل جديد |
| `/customers/:id` | `PUT` | `customers.update` | تعديل بيانات العميل |

### 2.3 السيارات والتاريخ (Vehicles & History)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/vehicles` | `GET` | `vehicles.view` | البحث في السيارات باللوحة أو VIN أو المالك |
| `/vehicles/:id` | `GET` | `vehicles.view` | بيانات السيارة التفصيلية والمالك الحالي |
| `/vehicles/:id/timeline` | `GET` | `vehicles.view` | **التايم لاين الكامل:** كل الأحداث والزيارات والإصلاحات والزيوت |
| `/vehicles` | `POST` | `vehicles.create` | تسجيل سيارة جديدة مع ربطها بالمالك |
| `/vehicles/:id` | `PUT` | `vehicles.update` | تحديث بيانات السيارة |
| `/vehicles/:id/transfer-ownership` | `POST` | `vehicles.update` | نقل ملكية السيارة لعميل جديد وتوثيق الأرشيف |

### 2.4 زيارات الورشة (Work Visits)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/visits` | `GET` | `visits.view` | قائمة الزيارات الحالية والسابقة مع فلاتر الحالة |
| `/visits/:id` | `GET` | `visits.view` | تفاصيل الزيارة، أوامر العمل، الصور، الفحص |
| `/visits` | `POST` | `visits.create` | تسجيل دخول سيارة جديدة وقراءة العداد والشكوى |
| `/visits/:id/status` | `PATCH` | `visits.update` | تحديث حالة الزيارة (فحص، صيانة، جاهزة، تسليم) |

### 2.5 أوامر الإصلاح والمهام (Work Orders & Tasks)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/work-orders` | `GET` | `work_orders.view` | أوامر الإصلاح في الورشة |
| `/work-orders/:id` | `GET` | `work_orders.view` | تفاصيل أمر العمل والمهام المسندة للفنيين |
| `/work-orders` | `POST` | `work_orders.create` | إنشاء أمر إصلاح جديد |
| `/work-orders/tasks` | `POST` | `work_orders.update` | إضافة مهمة وتوزيع الفنيين عليها |
| `/work-orders/tasks/:id/status` | `PATCH` | `tasks.update` | تحديث حالة المهمة (بدء، مكتملة) مع توثيق التوقيت |
| `/work-orders/tasks/:id/parts` | `POST` | `parts.consume` | صرف قطعة غيار للمهمة وخصمها من المخزون مع مفتاح عدم التكرار |

### 2.6 كشف الأعطال وأكواد DTC (Diagnostics & DTC)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/diagnostics` | `GET` | `diagnostics.view` | تقارير الفحص المسجلة |
| `/diagnostics` | `POST` | `diagnostics.create` | تسجيل تقرير فحص كمبيوتر وتوثيق نوع الجهاز والنظام |
| `/diagnostics/:id/codes` | `POST` | `diagnostics.create` | إضافة أكواد DTC (P0301...) وحالتها والـ Freeze Frame |
| `/diagnostics/code-history/:code` | `GET` | `diagnostics.view` | تاريخ ظهور كود معين عبر زيارات السيارة المتتالية |

### 2.7 الزيوت والصيانة الدورية (Oil & Fluids)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/fluids` | `GET` | `fluids.view` | سجلات تغيير الزيوت والسوائل |
| `/fluids` | `POST` | `fluids.create` | تسجيل تغيير زيت/سائل، اللزوجة، موعد التغيير القادم وعداد الكيلومترات |
| `/fluids/upcoming` | `GET` | `fluids.view` | السيارات المستحقة لمواعيد الصيانة الدورية وتغيير الزيت |

### 2.8 المخزون وقطع الغيار (Inventory & Parts)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/parts` | `GET` | `inventory.view` | دليل قطع الغيار، الرصيد المتاح، وحدود التنبيه |
| `/parts` | `POST` | `inventory.manage` | إضافة صنف جديد في المخزون |
| `/parts/:id` | `PUT` | `inventory.manage` | تعديل بيانات القطعة أو الأسعار |
| `/parts/movements` | `POST` | `inventory.manage` | تسجيل حركة توريد أو تسوية مخزنية |
| `/parts/alerts/low-stock` | `GET` | `inventory.view` | تنبيهات القطع التي وصلت للحد الأدنى |

### 2.9 الفواتير والمدفوعات والمصروفات (Invoices, Payments & Expenses)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/invoices` | `GET` | `invoices.view` | سجل الفواتير وحالاتها والديون المستحقة |
| `/invoices/:id` | `GET` | `invoices.view` | تفاصيل الفاتورة وبنودها والدفعات المسجلة |
| `/invoices` | `POST` | `invoices.create` | إنشاء فاتورة جديدة من أمر عمل أو بنود حرة |
| `/payments` | `POST` | `payments.create` | تسجيل دفعة نقدية/شبكة لفاتورة وإصدار سند قبض |
| `/expenses` | `GET` | `expenses.view` | سجل المصروفات العامة مع التصفية بالفترة |
| `/expenses` | `POST` | `expenses.create` | تسجيل مصروف جديد وتصنيفه |

### 2.10 التقارير والمؤشرات (Reports & Dashboard)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/reports/dashboard` | `GET` | عام للورشة | إحصائيات لوحة التحكم اللحظية (السيارات، المهام، التنبيهات) |
| `/reports/financial` | `GET` | `reports.financial`| المبيعات، التحصيلات، تكلفة القطع، الأرباح، الديون |
| `/reports/mechanics-productivity` | `GET` | `reports.manage` | ساعات عمل الفنيين وعدد المهام المنجزة |

### 2.11 الملفات والمزامنة والنسخ الاحتياطي (Files, Sync & Admin)
| المسار | الطريقة | الصلاحية | الوصف |
|:---|:---|:---|:---|
| `/attachments/upload` | `POST` | مصادق عليه | رفع صورة أو ملف PDF مع ربطه بالسيارة والزيارة |
| `/sync/pull` | `POST` | مصادق عليه | جلب التحديثات الجديدة بناءً على آخر توقيت مزامنة |
| `/sync/push` | `POST` | مصادق عليه | إرسال العمليات المتراكمة في الأوفلاين ومعالجتها تسلسلياً |
| `/admin/backup` | `POST` | `owner` | إنشاء نسخة احتياطية فورية وتنزيلها |
| `/admin/restore` | `POST` | `owner` | استعادة قاعدة البيانات من ملف نسخة احتياطية |
