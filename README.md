# Nordic Nature — E‑Ticaret Demo + Admin ve Auth

Bu proje, TemplateMo 595 3D Coverflow temasını temel alarak profesyonel bir e‑ticaret deneyimine dönüştürülmüş, yönetim paneli ve basit kullanıcı kayıt/giriş sistemi ile zenginleştirilmiştir.

Özellikler:
- 3D kapak akışı ile etkileyici vitrin
- Mağaza: arama, sıralama, ürün kartları (LocalStorage üzerinden yönetilebilir)
- Sepet: miktar artır/azalt, kaldır, ara toplam/kargo/toplam
- Ödeme: sipariş özeti ve form (demo)
- Admin paneli: site ayarları, ürün CRUD, kullanıcı yönetimi (LocalStorage)
- Basit Auth: kullanıcı kayıt/giriş/çıkış (LocalStorage), ilk kullanıcı otomatik admin
- Mobil uyumlu ve modern arayüz

Kullanım:
1) Giriş/Kayıt
- Üst menüde “Giriş” veya “Kayıt Ol” ile kullanıcı oluşturun.
- İlk kayıt olan kullanıcı admin olarak atanır.

2) Admin Paneli
- Admin olarak giriş yaptıktan sonra menüde “Admin” linki görünür.
- Ürün ekleme/düzenleme/silme, site başlığı ve vitrin metinlerini kaydedebilirsiniz.

3) Mağaza ve Sepet
- Mağaza bölümünden ürünleri sepete ekleyin.
- Sağ üstteki “Sepet” butonu ile sepeti açıp miktarları düzenleyin.
- “Ödeme” bölümünde demo özeti görüntülenir.

Notlar:
- Tüm veriler LocalStorage ile saklanır (demo amaçlıdır, gerçek üretim için sunucu ve veritabanı gerekir).
- Gerçek ödeme entegrasyonu dahil değildir.
- Görseller `images/` klasöründedir.

Üretime Hazırlık Önerileri:
- Backend: Node.js (Express) + PostgreSQL/SQLite veya Firebase/Supabase
- Auth: JWT veya sağlayıcı tabanlı (Auth0/Clerk/Firebase Auth)
- Ödeme: Stripe, iyzico veya PAYTR
- Dosya ve ürün yönetimi: Admin UI + REST API
