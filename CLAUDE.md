# Parfüm Formül, Esans Stok ve Public Katalog Web Uygulaması PRD

Kaynak veri: Mevcut PARFUM.xlsx dosyası; Excel’deki parfüm adı, parti, esans ml, cinsiyet, ücret, kullanılan esans oranı, yapım tarihi, parfüm ml, alkol ml, su ml, kalan esans ml ve notlar alanları MVP veri modelinin başlangıç noktası olarak alınmıştır. 

---

## TL;DR

Bu ürün, hobi olarak parfüm yapan bir kullanıcının elindeki esansları, hazırladığı parfüm partilerini, reçete oranlarını, kalan stokları ve üretim geçmişini web üzerinden yönetmesini sağlayan bir uygulamadır. Uygulamanın iki ana yüzü olacaktır: yönetici panelinde parfüm üreticisi stok, reçete, parti ve maliyet bilgilerini güncel tutar; public katalog tarafında ise herkes hangi parfümlerin mevcut olduğunu, kadın/erkek/unisex sınıflandırmasını, detaylı formül oranlarını ve üretim notlarını görüntüleyebilir.

MVP’de mevcut Excel dosyası tek seferlik içe aktarılacak ve bugüne kadarki üretim kayıtları uygulamaya taşınacaktır. Sonrasında kullanıcı yeni esans, yeni parfüm, yeni parti ve yeni reçete oluşturdukça sistem stokları otomatik güncelleyecek, azalan veya biten esansları işaretleyecek, belirli bir reçeteden kaç şişe daha üretilebileceğini hesaplayacak ve stok eksiye düşme gibi hataları önleyecektir.

Ürün ilk aşamada satış, sipariş, ödeme veya arkadaşların yorum/rezervasyon bırakması gibi özellikleri kapsamaz. Public ziyaretçiler yalnızca görüntüleme yapar. Uzun vadede ürün, parfüm hobistlerinin formül keşfedebileceği, farklı esans oranlarını karşılaştırabileceği ve kişisel üretim arşivlerini paylaşabileceği niş bir topluluk platformuna dönüşebilir.

---

## Ürün Vizyonu

Parfüm hobisi zamanla basit bir deneme defterinden çok daha karmaşık bir bilgi sistemine dönüşür. Hangi esans ne kadar kaldı, hangi parfüm hangi oranda yapıldı, hangi parti ne zaman üretildi, hangi koku kadın/erkek/unisex olarak sınıflandırıldı, hangi esans bitti, hangi reçete tekrar yapılabilir gibi sorular Excel’de takip edilebilir; ancak Excel paylaşım, filtreleme, güncellik, public erişim ve akıllı stok uyarıları açısından sınırlıdır.

Bu uygulamanın vizyonu, bireysel parfüm üretim bilgisini düzenli, güncel ve paylaşılabilir bir dijital arşive dönüştürmektir. Kullanıcı kendi üretim panelinde detaylı çalışırken, public tarafta arkadaşlar ve diğer parfüm meraklıları sade bir katalog üzerinden mevcut parfümleri ve detaylı reçeteleri görebilir.

En kritik ürün yaklaşımı şudur: Yönetici paneli detaylı ve hesaplama odaklı olmalı; public katalog ise temiz, anlaşılır, keşfedilebilir ve güven verici olmalıdır. Çünkü uygulamanın bir yüzü üretim operasyonu, diğer yüzü ise vitrin görevi görecektir.

---

## Hedefler

### Kullanıcı Hedefleri

* Mevcut Excel verilerini kaybetmeden web uygulamasına taşımak.
* Parfüm üretimlerini parti bazında takip etmek.
* Her parfüm için kullanılan esans, alkol, su, toplam ml, oran ve üretim tarihini kayıt altında tutmak.
* Esans stoklarının otomatik güncellenmesini sağlamak.
* Hangi esansın azaldığını, bittiğini veya hangi reçeteleri üretmeye yetmediğini hızlıca görmek.
* Arkadaşların ve diğer ziyaretçilerin public katalogdan mevcut parfümleri inceleyebilmesini sağlamak.
* Diğer parfüm hobistlerinin detaylı oranlara bakarak fikir alabileceği açık bir formül arşivi oluşturmak.
* Excel’e bağımlılığı azaltmak ve güncel tek kaynak olarak web uygulamasını kullanmak.

### Ürün Hedefleri

* İlk kurulumda Excel’den başarılı veri aktarımı sağlamak.
* Yönetici için basit ama güçlü bir stok ve reçete yönetimi deneyimi sunmak.
* Public ziyaretçiler için hızlı, mobil uyumlu ve filtrelenebilir katalog deneyimi sunmak.
* Stok hesaplarını manuel hataya açık olmaktan çıkarıp sistem hesaplamasına bağlamak.
* Parfüm reçetelerini standart, karşılaştırılabilir ve tekrar üretilebilir formatta saklamak.
* Gelecekte topluluk, yorum, puanlama ve reçete paylaşımı gibi özelliklere genişleyebilecek bir veri mimarisi kurmak.

### İş / Strateji Hedefleri

* Kişisel hobi arşivini profesyonel görünümlü bir portföye dönüştürmek.
* Parfüm meraklıları arasında güvenilir, şeffaf ve detaylı formül paylaşımı yapan bir vitrin oluşturmak.
* Ürünü ileride başka hobi üreticilerinin de kullanabileceği çok kullanıcılı bir SaaS yapısına dönüştürmeye uygun tasarlamak.
* İlk versiyonda karmaşık ticari özelliklere girmeden net bir “katalog + stok + reçete” çekirdeği oluşturmak.

### Non-Goals

* MVP’de ödeme alma, sepet, sipariş, kargo veya e-ticaret akışı olmayacak.
* Public kullanıcılar yorum, beğeni, rezervasyon veya talep oluşturmayacak.
* MVP’de diğer kullanıcıların kendi reçetelerini ekleyebileceği topluluk hesabı olmayacak.
* Excel ile sürekli çift yönlü senkronizasyon yapılmayacak; yalnızca ilk içe aktarma desteklenecek.
* Profesyonel parfüm regülasyonu, IFRA uyumluluğu, alerjen bildirimi veya kimyasal güvenlik sertifikasyonu MVP kapsamına alınmayacak.
* Barkod, etiket yazdırma, fatura veya muhasebe entegrasyonu MVP’de yer almayacak.

---

## Hedef Kullanıcılar ve Personalar

### 1. Yönetici / Parfüm Üreticisi

Bu kişi uygulamanın sahibidir. Esansları satın alır, farklı parfüm reçeteleri dener, partiler üretir ve hangi üründen ne kadar kaldığını takip eder. Bugün bu işi Excel üzerinden yapmaktadır; fakat veri güncelliği, paylaşım ve stok hesapları için daha güvenilir bir sisteme ihtiyaç duyar.

Temel ihtiyaçları:
* Esans stoklarını görmek ve güncellemek.
* Yeni üretim partisi oluşturmak.
* Reçete oranlarını detaylı saklamak.
* Üretim sonrası stokların otomatik düşmesini sağlamak.
* Hangi reçetelerin tekrar üretilebilir olduğunu görmek.
* Public görünümde hangi bilgilerin yayınlanacağını kontrol etmek.
* Geçmiş üretimlere dönüp not, oran, tarih ve miktar bilgilerini incelemek.

Başarı kriteri:
Yönetici Excel’e bakmadan uygulama üzerinden tüm üretim ve stok durumunu güvenle yönetebiliyorsa ürün başarılıdır.

### 2. Arkadaş / Eş Dost Ziyaretçisi

Bu kişi parfüm üreticisinin çevresindendir. Uygulamaya public link üzerinden girer. Amacı hangi parfümlerin mevcut olduğunu, hangi parfümün kadın/erkek/unisex olduğunu, belki genel notları ve formül detaylarını görmektir. Herhangi bir hesap açmak veya işlem yapmak istemez.

Temel ihtiyaçları:
* Mevcut parfümleri hızlıca görmek.
* Kadın, erkek, unisex filtreleriyle gezmek.
* Parfüm adını veya markasını aramak.
* Stokta olup olmadığını anlamak.
* Detay sayfasında üretim oranlarını ve notları okumak.

Başarı kriteri:
Ziyaretçi 10–20 saniye içinde aradığı parfümü bulabiliyorsa ve parfümün temel bilgilerini anlayabiliyorsa public katalog başarılıdır.

### 3. Parfüm Hobisti / Meraklı Ziyaretçi

Bu kişi parfüm üretimiyle ilgilenen, başka insanların oranlarına ve denemelerine bakmak isteyen bir kullanıcıdır. Onun için ürün yalnızca “hangi parfüm var” kataloğu değil, aynı zamanda öğrenme ve kıyaslama kaynağıdır.

Temel ihtiyaçları:
* Reçete oranlarını detaylı görmek.
* Esans/alkol/su dağılımını incelemek.
* Farklı partilerde oran değişmiş mi anlamak.
* Notlar, kalıcılık, yoğunluk ve üretim tarihi gibi bağlamsal bilgileri görmek.
* Benzer koku profillerini veya aynı parfümün farklı partilerini karşılaştırmak.

Başarı kriteri:
Hobist kullanıcı formülü anlayabiliyor, kendi denemelerine referans alabiliyor ve katalogu güvenilir buluyorsa ürün değer üretir.

---

## Kullanıcı Hikayeleri

### Yönetici Hikayeleri

* Bir yönetici olarak mevcut Excel dosyamı sisteme yüklemek istiyorum, böylece bugüne kadar yaptığım tüm parfümler, partiler ve stok bilgileri kaybolmadan web uygulamasına taşınsın.

* Bir yönetici olarak yeni bir esans eklemek istiyorum, böylece satın aldığım esansın başlangıç ml miktarını, kalan miktarını, cinsiyet/koku kategorisini ve notlarını kaydedebileyim.

* Bir yönetici olarak yeni bir parfüm reçetesi oluşturmak istiyorum, böylece parfümün toplam ml, esans oranı, alkol ml, su ml ve özel notlarını tekrar üretilebilir şekilde saklayabileyim.

* Bir yönetici olarak yeni parti üretimi yaptığımda kullanılan esans miktarının stoktan otomatik düşmesini istiyorum, böylece kalan stokları manuel hesaplamak zorunda kalmayayım.

* Bir yönetici olarak stok seviyesi azalan veya biten esansları dashboard’da görmek istiyorum, böylece yeni sipariş vermem gereken esansları hızlıca fark edeyim.

* Bir yönetici olarak sistemin “bu reçeteden mevcut stokla kaç şişe daha yapılabilir” hesaplamasını istiyorum, böylece üretim planı yaparken hata yapmayayım.

* Bir yönetici olarak public katalogda görünecek/gizlenecek parfümleri seçmek istiyorum, böylece deneme aşamasındaki veya paylaşmak istemediğim kayıtlar görünmesin.

* Bir yönetici olarak geçmiş partiler arasında oran ve sonuç karşılaştırması yapmak istiyorum, böylece aynı parfümü geliştirirken hangi denemenin daha başarılı olduğunu anlayabileyim.

### Arkadaş / Ziyaretçi Hikayeleri

* Bir ziyaretçi olarak public linke girip mevcut parfümleri görmek istiyorum, böylece hangi kokuların olduğunu kolayca anlayayım.

* Bir ziyaretçi olarak kadın, erkek ve unisex filtrelerini kullanmak istiyorum, böylece bana uygun kategorideki parfümleri hızlıca gezeyim.

* Bir ziyaretçi olarak parfüm adına göre arama yapmak istiyorum, böylece belirli bir marka veya parfümü kolayca bulayım.

* Bir ziyaretçi olarak parfüm detayına girip oranları ve notları görmek istiyorum, böylece parfümün nasıl hazırlandığını anlayayım.

### Parfüm Hobisti Hikayeleri

* Bir hobist olarak detaylı reçete oranlarını görmek istiyorum, böylece kendi denemelerimde benzer oranları referans alayım.

* Bir hobist olarak aynı parfümün farklı partilerini karşılaştırmak istiyorum, böylece oran değişikliklerinin üretim yaklaşımını nasıl etkilediğini göreyim.

* Bir hobist olarak üretim tarihi ve notları görmek istiyorum, böylece reçetenin sadece sayısal değil deneyimsel tarafını da anlayayım.

---

## MVP Kapsamı

### MVP’de Olacaklar

* Email/şifre veya tek yönetici girişi.
* Admin dashboard.
* Excel’den tek seferlik veri içe aktarma.
* Parfüm listesi yönetimi.
* Esans/stok yönetimi.
* Parti/üretim kaydı yönetimi.
* Detaylı reçete oranları.
* Otomatik stok düşümü.
* Az stok, biten stok ve yetersiz stok uyarıları.
* Public katalog sayfası.
* Public parfüm detay sayfası.
* Cinsiyet filtresi: Kadın, Erkek, Unisex.
* Parfüm adı/marka araması.
* Stok durumu gösterimi: Mevcut, Az Stok, Bitti.
* Public görünürlük kontrolü.
* Mobil uyumlu tasarım.
* Basit istatistik paneli.

---

## Fonksiyonel Gereksinimler

### 1. Kimlik Doğrulama ve Yetki

Öncelik: Must-have

Sistem ilk versiyonda tek yönetici hesabı mantığıyla çalışmalıdır. Yönetici uygulamaya giriş yaparak tüm veri ekleme, düzenleme, silme ve yayınlama işlemlerini gerçekleştirebilir. Public kullanıcılar herhangi bir giriş yapmadan yalnızca görüntüleme yapabilir.

Gereksinimler:
* Yönetici email ve şifre ile giriş yapabilmeli.
* Giriş yapılmadan admin sayfalarına erişilememeli.
* Public katalog herkes tarafından erişilebilir olmalı.
* Public kullanıcı hiçbir veriyi değiştirememeli.
* Admin oturumu belirli süre sonra güvenlik için yenilenmeli.
* Şifre sıfırlama desteklenmeli.

Yetki modeli:
* Admin: Tüm kayıtları oluşturabilir, düzenleyebilir, silebilir, public görünürlüğü değiştirebilir.
* Public Visitor: Sadece public olarak işaretlenmiş kayıtları okuyabilir.

ASSUMED:
MVP’de yalnızca bir yönetici olacaktır. Gelecekte “Editor”, “Viewer”, “Collaborator” gibi roller eklenebilir.

---

### 2. Excel İçe Aktarma

Öncelik: Must-have

Mevcut Excel dosyası uygulamanın başlangıç verisi olacaktır. Bu nedenle içe aktarma akışı kritik bir onboarding adımıdır. Excel’deki mevcut satırlar okunmalı, alanlar standart veri modeline dönüştürülmeli ve sistemde parfüm, parti, reçete ve stok kayıtları oluşturulmalıdır.

Excel’de gözlenen temel kolonlar:
* Parti bilgisi
* Parfüm adı
* Esans başlangıç ml
* Cinsiyet
* Ücret
* Kullanılan esans oranı %
* Yapım tarihi
* Parfüm ml
* Kullanılan esans ml
* Alkol ml
* Su ml
* Kalan esans ml
* Notlar

İçe aktarma adımları:
1. Yönetici Excel dosyasını yükler.
2. Sistem kolonları otomatik algılar.
3. Sistem örnek önizleme gösterir.
4. Yönetici alan eşleştirmelerini onaylar.
5. Sistem veri doğrulama yapar.
6. Hatalı veya eksik satırlar raporlanır.
7. Geçerli satırlar içe aktarılır.
8. İçe aktarma özeti gösterilir.

Doğrulama kuralları:
* Parfüm adı boş olamaz.
* Toplam parfüm ml pozitif sayı olmalıdır.
* Kullanılan esans oranı 0 ile 1 veya 0 ile 100 formatlarından biri olarak algılanmalı ve normalize edilmelidir.
* Yapım tarihi geçerli tarih olmalıdır.
* Cinsiyet değeri Kadın, Erkek veya Unisex olarak normalize edilmelidir.
* Kullanılan esans ml, toplam parfüm ml ve oran arasında tutarsızlık varsa sistem uyarı vermelidir.
* Kalan esans ml negatif olamaz.
* Aynı parfüm adı farklı partilerde tekrar edebilir; bu hata değil, üretim geçmişidir.

Excel aktarımında önemli karar:
Excel’de “parfüm adı” aynı zamanda çoğu durumda kullanılan ana esansı veya parfüm muadilini temsil ediyor olabilir. MVP’de bu kayıtlar hem “Perfume” hem de “Essence” ilişkisiyle modellenmelidir. Yani “Chanel - No:5” bir public parfüm adı olarak görünürken, stok tarafında bu parfümü üretmek için kullanılan ana esans olarak da izlenebilir.

Hata yönetimi:
* Eksik parfüm adı: Satır içe aktarılmaz.
* Eksik cinsiyet: “Belirtilmemiş” olarak işaretlenir, admin panelinde düzeltilmesi istenir.
* Eksik not: Boş bırakılır.
* Oran formatı belirsiz: Satır uyarılı aktarılır veya manuel düzeltme istenir.
* Tarih okunamıyor: Satır aktarılır ancak tarih “bilinmiyor” olarak işaretlenir ve admin panelinde uyarı gösterilir.

---

### 3. Esans ve Stok Yönetimi

Öncelik: Must-have

Esans stok yönetimi uygulamanın operasyonel kalbidir. Yönetici elindeki her esansı başlangıç miktarı, kalan miktar, kullanım geçmişi ve stok durumu ile takip edebilmelidir.

Esans alanları:
* Esans adı
* Marka/parfüm referansı
* Cinsiyet etiketi: Kadın, Erkek, Unisex, Belirtilmemiş
* Başlangıç miktarı ml
* Kalan miktar ml
* Kullanılan toplam miktar ml
* Minimum stok eşiği ml
* Ortalama kullanım oranı
* Notlar
* Stok durumu
* Oluşturulma tarihi
* Son güncelleme tarihi

Stok durumları:
* Mevcut: Kalan miktar minimum eşikten yüksek.
* Az Stok: Kalan miktar minimum eşik veya altına inmiş.
* Bitti: Kalan miktar 0.
* Yetersiz: Seçilen reçeteyi üretmek için yeterli stok yok.
* Veri Tutarsız: Başlangıç, kullanım ve kalan miktar arasında hesap farkı var.

Akıllı stok özellikleri:
* Kullanılan esans ml üretim kaydı oluşturulduğunda otomatik stoktan düşmeli.
* Üretim kaydı silinirse veya düzenlenirse stok yeniden hesaplanmalı.
* Sistem “bu esansla kaç adet 25 ml / 50 ml / 100 ml şişe yapılabilir” hesaplamalı.
* Minimum stok eşiği admin tarafından ayarlanabilmeli.
* Biten esanslar dashboard’da ayrı gösterilmeli.
* Az stoktaki esanslar uyarı kartlarında gösterilmeli.
* Stok eksiye düşecekse üretim engellenmeli veya admin onaylı “eksi stokla kaydet” seçeneği sunulmalı.

Örnek hesaplama:
* Reçete toplam: 50 ml
* Esans oranı: %25
* Gerekli esans: 12.5 ml
* Kalan esans: 37 ml
* Üretilebilir adet: floor(37 / 12.5) = 2 adet 50 ml şişe

Tradeoff:
Stok hesaplama ne kadar otomatik olursa sistem o kadar güvenilir olur; fakat geçmiş Excel verilerinde manuel hesap farkları olabilir. Bu nedenle MVP’de “sistem hesaplanan kalan” ve “Excel’den gelen kalan” karşılaştırılmalı, fark varsa admin’e veri tutarsızlığı olarak gösterilmelidir.

---

### 4. Parfüm ve Reçete Yönetimi

Öncelik: Must-have

Parfüm kaydı, public katalogda görünen ana varlıktır. Reçete ise bu parfümün nasıl üretildiğini tarif eder. Aynı parfümün birden fazla partisi olabilir; örneğin aynı parfüm 2024’te %25 esans oranıyla, 2025’te %20 esans oranıyla tekrar yapılmış olabilir. Bu nedenle veri modeli parfüm ile üretim partisini ayırmalıdır.

Parfüm alanları:
* Parfüm adı
* Marka / ilham alınan koku adı
* Cinsiyet: Kadın, Erkek, Unisex, Belirtilmemiş
* Public görünürlük
* Kapak görseli veya placeholder
* Kısa açıklama
* Genel notlar
* Toplam üretilen miktar
* Mevcut stok durumu
* Son üretim tarihi
* Oluşturulma tarihi

Reçete / parti alanları:
* Parti adı veya numarası
* Parfüm referansı
* Kullanılan esans
* Toplam parfüm ml
* Esans oranı %
* Esans ml
* Alkol ml
* Su ml
* Ücret / maliyet
* Yapım tarihi
* Notlar
* Public detay görünürlüğü
* Stok düşümü yapıldı mı?
* Oluşturan admin
* Son düzenleme tarihi

Reçete hesaplama kuralları:
* Esans ml = Toplam parfüm ml * Esans oranı
* Alkol ml + Su ml + Esans ml yaklaşık olarak toplam parfüm ml değerine eşit olmalı
* Küçük yuvarlama farkları kabul edilebilir
* Büyük farklarda sistem uyarı vermeli
* Esans oranı public sayfada yüzde formatında gösterilmeli
* Yönetici hem oran girerek ml hesaplatabilmeli hem de ml girerek oran hesaplatabilmeli

Örnek reçete gösterimi:
* Toplam hacim: 50 ml
* Esans oranı: %25
* Esans: 12.5 ml
* Alkol: 35 ml
* Su: 2.5 ml
* Yapım tarihi: 10 Ağustos 2024
* Parti: 1. Parti
* Not: Esans bitti / yoğunluk başarılı / tekrar denenebilir

Önemli UX kararı:
Admin panelinde reçete formu hesap makinesi gibi davranmalıdır. Kullanıcı toplam ml ve oran girdiğinde esans ml otomatik hesaplanmalı; alkol ve su alanları kalan hacme göre önerilmelidir. Ancak admin manuel değişiklik yapabilmelidir.

---

### 5. Public Katalog

Öncelik: Must-have

Public katalog herkesin erişebileceği vitrindir. Bu alan sade, hızlı ve filtrelenebilir olmalıdır. Public kullanıcıların hesap açması veya herhangi bir işlem yapması beklenmez.

Katalog özellikleri:
* Tüm public parfümler listelenir.
* Arama: Parfüm adı, marka veya not içinde arama yapılabilir.
* Filtreler:
  * Kadın
  * Erkek
  * Unisex
  * Stokta var
  * Az stok
  * Bitti
* Sıralama:
  * En yeni üretim
  * Ada göre
  * Cinsiyete göre
  * Stok durumuna göre
* Parfüm kartı:
  * Parfüm adı
  * Cinsiyet etiketi
  * Stok durumu
  * Son üretim tarihi
  * Kısa oran özeti
  * Detay butonu

Public detay sayfası:
* Parfüm adı
* Cinsiyet
* Stok durumu
* Üretim geçmişi / partiler
* Detaylı reçete oranları
* Esans ml
* Alkol ml
* Su ml
* Toplam ml
* Kullanılan esans oranı
* Yapım tarihi
* Notlar
* Benzer parfümler veya aynı cinsiyette diğer kokular

Public sayfada gösterilmemesi gerekenler:
* Admin panel linkleri
* Düzenleme butonları
* Hassas sistem notları
* İç yönetim uyarıları
* Oturum bilgileri
* Gizli olarak işaretlenmiş parfümler
* Public görünürlüğü kapalı partiler

Tradeoff:
Detaylı oranların public gösterilmesi ürünün şeffaflık ve hobi paylaşımı değerini artırır; fakat ileride ticari kullanım düşünülürse bazı reçeteleri gizleme ihtiyacı doğabilir. Bu nedenle MVP’de parfüm ve parti bazında public görünürlük kontrolü mutlaka olmalıdır.

---

### 6. Dashboard ve Akıllı Özetler

Öncelik: Should-have for MVP, Must-have for iyi kullanım deneyimi

Dashboard yönetici için hızlı karar ekranıdır. Kullanıcı uygulamaya girdiğinde genel stok sağlığını, son üretimleri ve dikkat gerektiren kayıtları görmelidir.

Dashboard kartları:
* Toplam parfüm sayısı
* Public yayında olan parfüm sayısı
* Toplam esans sayısı
* Az stoktaki esans sayısı
* Biten esans sayısı
* Son üretilen parfümler
* En çok kullanılan esanslar
* Veri tutarsızlığı olan kayıtlar
* Mevcut stokla üretilebilir reçeteler

Akıllı öneriler:
* “Paco Rabanne - Invictus esansı az stokta; mevcut reçeteye göre yaklaşık 3 adet 25 ml üretilebilir.”
* “Giorgio Armani - Acqua Di Gio esansı bitmiş görünüyor.”
* “Chanel - No:5 reçetesinde toplam ml ile bileşen toplamı arasında fark var.”
* “Son 6 ayda üretilmeyen ama stokta esansı olan parfümler.”

Dashboard’un amacı sadece raporlama değil, karar aldırmaktır. Bu nedenle kartlar tıklanabilir olmalı ve ilgili filtrelenmiş listeye götürmelidir.

---

### 7. Veri Düzenleme, Geçmiş ve Tutarlılık

Öncelik: Should-have

Üretim kayıtları stokları etkilediği için düzenleme işlemleri dikkatli tasarlanmalıdır. Admin geçmiş bir partiyi düzenlediğinde sistem stokları yeniden hesaplamalıdır.

Kurallar:
* Bir parti oluşturulduğunda stok düşer.
* Bir parti silindiğinde stok geri eklenir veya sistem yeniden hesaplar.
* Bir partide kullanılan esans ml değişirse stok fark kadar güncellenir.
* Bir esansın başlangıç stoğu değişirse tüm bağlı üretimlerden kalan stok yeniden hesaplanır.
* Manuel stok düzeltmesi yapılırsa sebep notu istenmelidir.
* Sistem kritik değişiklikler için activity log tutmalıdır.

Activity log örnekleri:
* “12.5 ml Chanel - No:5 esansı 1. Parti üretimi için kullanıldı.”
* “Paco Rabanne - Invictus kalan stok manuel olarak 17 ml’den 22 ml’ye güncellendi.”
* “Christian Dior - Sauvage reçetesinde esans oranı %28’den %25’e değiştirildi.”

ASSUMED:
MVP’de tam gelişmiş versiyonlama yerine basit activity log yeterlidir. Gelecekte tam audit trail ve geri alma sistemi eklenebilir.

---

## UX ve Kullanıcı Akışları

### İlk Kurulum Akışı

1. Yönetici uygulamaya giriş yapar.
2. “Excel’den Başla” seçeneğini görür.
3. PARFUM.xlsx dosyasını yükler.
4. Sistem kolonları algılar ve eşleştirme ekranı gösterir.
5. Yönetici eşleştirmeyi onaylar.
6. Sistem veri önizlemesi verir.
7. Hatalı satırlar varsa listeler.
8. Yönetici “İçe Aktar” der.
9. Sistem parfüm, parti ve stok kayıtlarını oluşturur.
10. Dashboard’da aktarım özeti gösterilir.

Başarı ekranı:
* “41 üretim kaydı içe aktarıldı.”
* “X benzersiz parfüm oluşturuldu.”
* “Y esans stoğu oluşturuldu.”
* “Z satırda kontrol edilmesi gereken tutarsızlık var.”

Hata durumları:
* Dosya okunamadı.
* Kolonlar algılanamadı.
* Zorunlu alanlar eksik.
* Bazı satırlar aktarılmadı.
* Oran formatı belirsiz.

UX gereksinimi:
Hata mesajları teknik olmamalıdır. Örneğin “Column parse failed” yerine “Kullanılan esans oranı bazı satırlarda okunamadı. Lütfen bu satırları kontrol et.” gibi açıklayıcı dil kullanılmalıdır.

---

### Yeni Parfüm / Parti Ekleme Akışı

1. Admin “Yeni Üretim” butonuna tıklar.
2. Var olan parfüm seçer veya yeni parfüm adı girer.
3. Cinsiyet seçer.
4. Toplam üretim ml girer.
5. Esans oranı veya esans ml girer.
6. Sistem diğer alanları hesaplar.
7. Alkol ve su ml değerleri önerilir.
8. Admin gerekirse değerleri değiştirir.
9. Kullanılacak esansı seçer.
10. Sistem stok yeterliliğini kontrol eder.
11. Eğer stok yeterliyse üretim kaydedilir.
12. Stok otomatik düşer.
13. Public görünürlük seçilir.
14. Detay sayfası oluşur.

Stok yetersizse:
* Sistem üretimi engeller.
* “Bu üretim için 14 ml esans gerekiyor; mevcut stok 10 ml.” mesajı gösterilir.
* Admin’e şu seçenekler sunulur:
  * Miktarı azalt
  * Oranı azalt
  * Farklı esans seç
  * Stok güncelle

---

### Public Katalog Akışı

1. Ziyaretçi public URL’ye girer.
2. Katalog sayfasında parfüm kartlarını görür.
3. Cinsiyet filtresi seçer.
4. Arama yapar.
5. Bir parfüm kartına tıklar.
6. Detay sayfasında reçete oranlarını ve partileri inceler.
7. Geri dönüp başka parfümleri gezer.

Public kullanıcıya gösterilecek dil:
* Basit, açıklayıcı ve hobi dostu olmalı.
* “Esans oranı”, “alkol”, “su”, “toplam hacim” gibi teknik terimler korunmalı; ancak gerekirse küçük açıklamalarla desteklenmeli.
* Stok durumu net olmalı: “Mevcut”, “Az kaldı”, “Bitti”.

---

## Veri Modeli

### Entity: User

Alanlar:
* id
* email
* password_hash
* role
* created_at
* updated_at

MVP’de tek admin olsa bile User entity’si gelecekte çoklu kullanıcıya geçiş için korunmalıdır.

---

### Entity: Essence

Alanlar:
* id
* name
* gender_category
* initial_volume_ml
* current_volume_ml
* minimum_stock_threshold_ml
* total_used_ml
* notes
* status
* created_at
* updated_at

Status hesaplama:
* current_volume_ml <= 0 ise Bitti
* current_volume_ml <= minimum_stock_threshold_ml ise Az Stok
* aksi halde Mevcut

---

### Entity: Perfume

Alanlar:
* id
* name
* brand_name
* gender_category
* description
* public_visible
* cover_image_url
* notes
* latest_batch_date
* total_produced_ml
* created_at
* updated_at

---

### Entity: Batch / Production

Alanlar:
* id
* perfume_id
* essence_id
* batch_label
* production_date
* total_volume_ml
* essence_ratio
* essence_volume_ml
* alcohol_volume_ml
* water_volume_ml
* cost
* notes
* public_visible
* stock_deducted
* created_at
* updated_at

---

### Entity: StockMovement

Alanlar:
* id
* essence_id
* batch_id
* movement_type
* quantity_ml
* reason
* created_at
* created_by

Movement type:
* initial_import
* production_usage
* manual_adjustment
* correction
* deletion_reversal

Stok hareketi tablosu kritik önemdedir. Sadece Essence.current_volume_ml alanını güncellemek yeterli değildir; stok değişimlerinin nedenlerini görmek gerekir. Böylece sistem güvenilir ve denetlenebilir olur.

---

### Entity: ImportJob

Alanlar:
* id
* filename
* status
* total_rows
* successful_rows
* failed_rows
* warnings_count
* mapping_config
* error_report
* created_at
* completed_at

---

## API ve Teknik Şekil Örnekleri

### Örnek: Yeni Üretim Oluşturma

Endpoint:
POST /api/admin/batches

Request:
{
  "perfumeId": "perfume_123",
  "essenceId": "essence_456",
  "batchLabel": "7. Parti",
  "productionDate": "2026-05-03",
  "totalVolumeMl": 50,
  "essenceRatio": 0.25,
  "essenceVolumeMl": 12.5,
  "alcoholVolumeMl": 35,
  "waterVolumeMl": 2.5,
  "cost": 120,
  "notes": "Dengeli ve yoğun deneme.",
  "publicVisible": true
}

Response:
{
  "id": "batch_789",
  "stockStatus": {
    "essenceId": "essence_456",
    "previousVolumeMl": 37,
    "usedVolumeMl": 12.5,
    "currentVolumeMl": 24.5,
    "status": "MEVCUT"
  }
}

---

### Örnek: Public Katalog Listeleme

Endpoint:
GET /api/public/perfumes?gender=Erkek&status=available&search=sauvage

Response:
{
  "items": [
    {
      "id": "perfume_123",
      "name": "Christian Dior - Sauvage",
      "genderCategory": "Erkek",
      "stockStatus": "Mevcut",
      "latestBatchDate": "2024-08-10",
      "summary": "%28 esans oranı ile üretilmiş 50 ml reçete"
    }
  ]
}

---

### Örnek: Üretilebilir Adet Hesabı

Endpoint:
GET /api/admin/essences/{id}/production-capacity?bottleSizeMl=50&essenceRatio=0.25

Response:
{
  "essenceId": "essence_456",
  "currentVolumeMl": 37,
  "requiredEssencePerBottleMl": 12.5,
  "possibleBottleCount": 2,
  "remainingAfterProductionMl": 12
}

---

## İş Kuralları

### Oran ve Hacim Kuralları

* essence_ratio sistemde 0–1 arası decimal olarak saklanmalıdır.
* Public UI’da yüzde olarak gösterilmelidir.
* Excel’de 0.25 gelirse %25 olarak yorumlanmalıdır.
* Excel’de 25 gelirse %25 olarak normalize edilmelidir.
* Esans ml değeri boşsa toplam ml ve oran üzerinden hesaplanmalıdır.
* Alkol veya su ml eksikse sistem öneri üretebilir ancak admin onayı gerekir.
* Bileşen toplamı ile toplam parfüm ml arasında %2’den fazla fark varsa uyarı verilmelidir.

### Stok Kuralları

* Üretim kaydı stok hareketi oluşturmadan tamamlanmış sayılmamalıdır.
* Stok 0’ın altına otomatik düşmemelidir.
* Manuel stok düzeltmesi için not zorunlu olmalıdır.
* Silinen üretim kayıtları hard delete yerine soft delete olarak işaretlenmelidir.
* Soft delete yapılan üretimin stok hareketi ters kayıtla dengelenmelidir.

### Public Görünürlük Kuralları

* Parfüm public değilse hiçbir public endpoint’te görünmez.
* Parfüm public olsa bile parti public değilse o parti detayda gösterilmez.
* Stokta bitmiş ürünler gizlenmez; ancak “Bitti” etiketiyle gösterilir.
* Public kullanıcılar maliyet/ücret bilgisini görmeyebilir.

ASSUMED:
Ücret alanı MVP’de admin tarafında tutulacak, public tarafta gösterilmeyecektir. Çünkü ücret bilgisi hobi kataloğunda kafa karıştırabilir ve satış algısı yaratabilir.

---

## UI/UX Gereksinimleri

### Admin Panel

Admin panel sade ve veri odaklı olmalıdır. Ana navigasyon şu bölümlerden oluşmalıdır:

* Dashboard
* Parfümler
* Esanslar / Stok
* Üretim Partileri
* Excel İçe Aktarma
* Public Katalog Ayarları

Admin listelerinde olması gereken ortak özellikler:
* Arama
* Filtreleme
* Sıralama
* Toplu görünürlük değiştirme
* CSV/Excel dışa aktarma, MVP sonrası
* Durum rozetleri
* Hızlı düzenleme

### Public Katalog

Public katalog görsel olarak daha temiz ve ziyaretçi dostu olmalıdır. Mobil öncelikli tasarlanmalıdır; çünkü arkadaşlar büyük ihtimalle linke telefondan girecektir.

Public katalog ekranları:
* Ana katalog
* Parfüm detay
* Cinsiyet filtreli liste
* Arama sonuçları
* Boş durum ekranı

Boş durum örnekleri:
* “Bu filtreye uygun parfüm bulunamadı.”
* “Kadın kategorisinde henüz public parfüm yok.”
* “Aradığın isimle eşleşen kayıt bulunamadı.”

Accessibility:
* Tüm filtreler klavye ile kullanılabilir olmalı.
* Renk rozetleri sadece renge bağlı anlam taşımamalı; metin etiketi de olmalı.
* Mobilde kartlar okunabilir olmalı.
* Kontrast yeterli olmalı.
* Form hataları açık metinle gösterilmeli.

---

## Başarı Metrikleri

### Aktivasyon Metrikleri

* Excel içe aktarma başarı oranı: >= %95
* İlk kurulumdan sonra dashboard’a ulaşma oranı: >= %90
* İlk yeni üretim kaydı oluşturma oranı: >= %70
* Admin’in Excel’e geri dönmeden uygulamada işlem yapma oranı: nitel feedback ile ölçülecek

### Public Kullanım Metrikleri

* Public katalog sayfa yükleme süresi: mobilde < 2 saniye hedef
* Katalogdan detay sayfasına tıklama oranı
* Arama kullanım oranı
* Cinsiyet filtresi kullanım oranı
* Ortalama ziyaret süresi
* En çok görüntülenen parfümler

### Stok ve Veri Kalitesi Metrikleri

* Veri tutarsızlığı olan satır sayısı
* Stok eksiye düşme denemesi sayısı
* Az stok uyarılarının görüntülenme sayısı
* Manuel stok düzeltmesi sayısı
* Başarılı otomatik stok hesaplama oranı

### Teknik Metrikler

* Uptime: >= %99
* Public katalog API response süresi: p95 < 500 ms
* Admin listeleme API response süresi: p95 < 700 ms
* Excel import işlem hatası oranı: < %5
* Kritik stok hesaplama hatası: 0 tolerans

---

## Tracking Plan

### Admin Event’leri

* admin_login_success
* excel_import_started
* excel_import_mapping_confirmed
* excel_import_completed
* excel_import_failed
* perfume_created
* perfume_updated
* perfume_public_visibility_changed
* essence_created
* essence_updated
* batch_created
* batch_updated
* batch_deleted
* stock_warning_viewed
* manual_stock_adjustment_created

### Public Event’leri

* public_catalog_viewed
* public_search_performed
* public_filter_applied
* public_perfume_detail_viewed
* public_batch_detail_expanded

### Sistem Sağlığı Event’leri

* stock_recalculation_completed
* stock_recalculation_failed
* import_row_validation_failed
* data_consistency_warning_created
* public_api_error
* admin_api_error

---

## Teknik Mimari Önerisi

### Frontend

Önerilen yaklaşım:
* Next.js veya benzeri server-rendered React framework
* Public katalog için SEO uyumlu sayfalar
* Admin panel için client-heavy dashboard yapısı
* Responsive tasarım
* Component bazlı UI

Neden:
Public katalog hızlı açılmalı ve paylaşılabilir olmalıdır. Server-side rendering veya static generation bu sayfalar için faydalı olur. Admin panelde ise form, hesaplama ve tablo etkileşimi yoğun olacağı için client-side interaktivite önemlidir.

### Backend

Önerilen yaklaşım:
* REST API veya tRPC benzeri typed API
* Node.js / NestJS / Next.js API routes seçeneklerinden biri
* Stok hesaplama için transaction destekli servis katmanı
* Excel import için ayrı job/service yapısı

Kritik backend servisleri:
* AuthService
* ImportService
* PerfumeService
* EssenceService
* BatchService
* StockService
* PublicCatalogService

### Database

Önerilen yaklaşım:
* PostgreSQL
* Prisma veya benzeri ORM
* Transaction kullanımı zorunlu
* Soft delete desteği
* Audit / stock movement kayıtları

Neden PostgreSQL:
Stok hareketleri, ilişkisel veri, filtreleme, raporlama ve gelecekte çok kullanıcılı yapıya geçiş için güçlü bir temel sağlar.

### Dosya Depolama

MVP’de kapak görseli şart değilse dosya depolama ertelenebilir. Eğer parfüm görseli veya Excel import dosyası saklanacaksa:
* S3 uyumlu object storage
* Dosya metadata’sı DB’de
* Admin dosyaları public erişime kapalı

### Hosting

MVP için:
* Vercel / Render / Railway / Fly.io gibi hızlı deploy edilebilir platformlar
* PostgreSQL managed database
* Public katalog için CDN avantajı

---

## Güvenlik ve Gizlilik

* Admin endpoint’leri auth gerektirmelidir.
* Public endpoint’ler yalnızca public_visible kayıtları döndürmelidir.
* Şifreler hash’lenmiş saklanmalıdır.
* Import edilen Excel dosyası kalıcı saklanacaksa admin dışında erişilememelidir.
* Public tarafta maliyet/ücret alanı gösterilmemelidir.
* API seviyesinde rate limiting uygulanmalıdır.
* Admin formları CSRF/XSS risklerine karşı korunmalıdır.
* Notlar alanında HTML sanitize edilmelidir.
* Soft delete kullanılan kayıtlar public API’da görünmemelidir.

---

## Edge Case’ler

### Excel Kaynaklı Edge Case’ler

* Aynı parfüm adı farklı partilerde geçer.
* Cinsiyet alanı boş veya farklı yazılmış olabilir.
* Esans oranı 0.25 veya 25 formatında gelebilir.
* Tarih formatı bozuk olabilir.
* Kalan esans ml Excel’de hesapla uyuşmayabilir.
* Notlar boş olabilir.
* Aynı satırda hem başlangıç esans ml hem kullanılan esans ml karışabilir.

Çözüm:
Import ekranı doğrulama ve önizleme sunmalı; sistem kesin karar veremediği alanları admin’e göstermelidir.

### Stok Edge Case’leri

* Geçmiş üretim düzenlenirse stok yanlış hesaplanabilir.
* Admin manuel stok değiştirirse geçmiş hareketlerle fark oluşabilir.
* Aynı esans farklı isimlerle kaydedilmiş olabilir.
* Kalan stok 0 ama yeni parti eklenmek istenebilir.
* Yuvarlama farkları stokta küçük sapmalar yaratabilir.

Çözüm:
Stok hareket tablosu kullanılmalı, kritik işlemler transaction içinde yapılmalı ve veri tutarsızlıkları dashboard’da gösterilmelidir.

### Public Katalog Edge Case’leri

* Public parfüm var ama public parti yok.
* Parfüm stokta bitti ama katalogda görünmeye devam ediyor.
* Çok uzun parfüm isimleri mobil kartı bozabilir.
* Notlarda özel bilgi yer alabilir.
* Ziyaretçi filtre sonrası boş sonuç görebilir.

Çözüm:
Public görünürlük hem parfüm hem parti düzeyinde kontrol edilmeli; boş durumlar açıklayıcı olmalı.

---

## MVP Önceliklendirme

### P0 – Olmazsa Olmaz

* Admin login
* Excel import
* Parfüm listesi
* Esans/stok listesi
* Üretim partisi oluşturma
* Otomatik stok düşümü
* Public katalog
* Public detay sayfası
* Cinsiyet filtreleri
* Public görünürlük kontrolü

### P1 – Güçlü MVP

* Dashboard stok uyarıları
* Üretilebilir şişe sayısı hesabı
* Veri tutarsızlığı uyarıları
* Stok hareket geçmişi
* Gelişmiş arama ve sıralama
* Mobil UX iyileştirmeleri

### P2 – MVP Sonrası

* Public görsel katalog
* Koku notaları / üst-orta-alt nota alanları
* Kalıcılık ve yayılım değerlendirmesi
* Yorum/beğeni
* Arkadaşlar için talep/rezervasyon
* Çoklu kullanıcı
* Reçete kopyalama
* Etiket yazdırma
* Topluluk reçete paylaşımı
