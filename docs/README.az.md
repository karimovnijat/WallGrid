# WallGrid — istifadə təlimatı

> 🇬🇧 English: [README.md](../README.md)

Bir brauzer pəncərəsində bir neçə sayt və ya dashboard göstərmək üçün ekran divarı. Ekranların sayını, ölçüsünü, yerini və açdığı ünvanı dəyişmək mümkündür.

## 1. Lazım olanlar

- Kompüterdə Node.js quraşdırılmalıdır. Terminalda `node --version` ilə yoxlayın.
- Chrome brauzeri avtomatik tam ekran açılışı üçün lazımdır. Adi istifadə zamanı başqa müasir brauzerdə də ünvanı açmaq olar.
- Layihə yazmağa icazə verilən qovluqda yerləşməlidir: ayarlar `data/` daxilində saxlanılır.
- Açılacaq saytlar həmin kompüterdən əlçatan olmalıdır. İnternet saytları üçün internet, daxili saytlar üçün uyğun şəbəkə/VPN lazım ola bilər.

Layihənin əlavə paket asılılığı yoxdur. `npm install` lazım deyil.

## 2. İşə salmaq

### Sadə üsul — bütün sistemlərdə

Layihənin qovluğunda terminal açın və yazın:

```bash
node server.js
```

Terminal açıq qalsın. Brauzerdə bu ünvanlara daxil olun:

- **Ekran divarı:** http://127.0.0.1:8080/
- **Redaktə:** http://127.0.0.1:8080/edit

Serveri dayandırmaq üçün terminalda **Ctrl+C** basın.

### Windows — avtomatik tam ekran

ZIP-i açdıqdan sonra `start.bat` faylını işə salın. Server və Chrome tam ekran rejimində açılır. Chrome-dan çıxmaq üçün **Alt+F4** istifadə edin. Server ayrıca pəncərədə işləyə bilər; işi dayandırmaq üçün `wallgrid-server` adlı pəncərəni də bağlayın.

### macOS / Linux — avtomatik tam ekran

Layihə qovluğunda:

```bash
bash start.sh
```

Chrome tam ekran rejimində açılır. macOS-da **Cmd+Q**, Linux-da **Alt+F4** ilə brauzeri bağlamaq olar. Skriptin açdığı Chrome prosesi bitdikdə server də dayandırılır.

## 3. İlk quruluş

1. `/edit` ünvanını açın.
2. Kiçik idarəetmə panelində **Ayarlar** düyməsini basın.
3. **Sətir** və **Sütun** sayını seçin. Məsələn, 3 sətir və 3 sütun — 9 monitor yeri deməkdir.
4. Lazımdırsa **Monitor daxili bölgü** seçin. `yox` bir monitoru bütöv saxlayır; `2×2` və ya `3×3` onu daha kiçik sahələrə bölür.
5. Hazır bölgünü seçib **Tətbiq et** basın. Mövcud düzülüş dəyişəcək; lazım gəlsə **Geri al** istifadə edin.
6. Boş yerlərə ekran əlavə etmək üçün **Boşluqları doldur** basın və ya boş sahədə siçanla yer çəkin.
7. Ekrana klikləyin, sağ paneldə adını və tam URL-ni yazın. Məsələn, `https://example.com/dashboard`.
8. Yan paneldə **Tətbiq et** basın. Saxlanma göstəricisi görünür; uğurla saxlanandan sonra panel bağlanır. Sonra **Bitir ✓** ilə redaktədən çıxın.

**Qeyd:** Boş xana ayrıca ekran deyil. Ekranı kiçiltdikdən sonra boş sahə qalarsa, ora yeni ekran əlavə edin. Qara boş sahə həmişə sıralanma xətası demək deyil.

## 4. Redaktə və idarəetmə

Redaktəyə daxil olmaq üçün `/edit` açın, sol yuxarı küncdə görünən **⚙** düyməsini basın və ya **Ctrl+Shift+E** (macOS-da **Cmd+Shift+E**) istifadə edin.

### Yığcam idarəetmə paneli

- Panel başlanğıcda yığcam görünür.
- **Ayarlar** ilə bütün alətləri açın, **Yığcamlaşdır** ilə gizlədin.
- **WallGrid** yazısından tutub paneli istədiyiniz kənara sürüşdürün. Beləliklə, arxasında qalan ekranlara çata bilərsiniz.
- Yazı üzərində klaviatura fokusu olduqda ox düymələri ilə də paneli köçürmək olar.
- Geniş paneldə **⇅** düyməsi paneli yuxarı/aşağı keçirir.
- **Bitir ✓** redaktəni bağlayır. Ümumi düzülüş ayarları avtomatik saxlanılır; yan paneldəki məzmun dəyişiklikləri üçün **Tətbiq et** basın.

### Ekranlarla işləmək

| Əməliyyat | Necə edilir |
|---|---|
| Ekranın ayarlarını açmaq | Ekrana klikləyin və ya onun ⚙ düyməsini basın |
| Yerini dəyişmək | Ekranı başqa ekranın üstünə sürüşdürüb buraxın |
| Boş yerə köçürmək | Ekranı boş sahəyə sürüşdürün; önizləməyə baxıb buraxın |
| Böyütmək / kiçiltmək | Ekranın küncündən tutub dartın |
| Birləşdirmək | Ekranı böyüdərək digər ekranları tam əhatə edin; içəridə qalan ekranlar birləşir |
| Bölmək | Ekranın ⊞ düyməsini basın |
| Yeni ekran yaratmaq | Boş xanalarda siçanla sahə çəkin və ya Boşluqları doldur basın |
| Silmək | Ekranın ✕ düyməsini və ya sağ paneldə Sil düyməsini basın |
| Yeniləmək | Ekranın ⟳ düyməsini basın |
| Geri qaytarmaq | Geri al və ya Ctrl+Z / Cmd+Z |
| Redaktədən çıxmaq | Bitir ✓; Esc əvvəl açıq yan paneli, sonra redaktəni bağlayır |

Birləşmə bir ekranın sahəsini böyüdür; bir neçə saytın məzmununu vahid sayta çevirmir.

Sağ paneldə **Miqyas** məzmunu böyüdüb-kiçildir. **Avtomatik yeniləmə** saniyə ilə verilir; `0` avtomatik yeniləməni söndürür. **Adı ekranın küncündə göstər** seçimi ekran adını baxış rejimində də göstərir.

## 5. Saxlama və ehtiyat nüsxə

- Cari ayarlar: `data/config.json`.
- Son yazılışdan əvvəlki nüsxə: `data/config.backup.json`.
- **Export** ayarları JSON faylı kimi endirir.
- **Import** seçilən JSON faylındakı ayarları tətbiq edir və mövcud quruluşu əvəz edir. Əvvəl Export etmək faydalıdır.
- Server rejimində baxış səhifəsi təxminən 5 saniyədən bir dəyişiklikləri yoxlayır.

Əsas istifadə üsulu serveri işə salmaqdır. `index.html` faylını birbaşa açmaq server rejimi deyil; brauzer yaddaşında qalan ayarları köçürmək üçün Export / Import lazımdır.

PIN redaktənin təsadüfən açılmasını məhdudlaşdırır. Serverə giriş üçün tam autentifikasiya sistemi deyil.

## 6. ZIP edib başqa kompüterə göndərmək

**Bəli, layihə başqa kompüterdə də işləyə bilər.** ZIP-i açmaq təkbaşına kifayət etmir: həmin kompüterdə Node.js olmalı və server işə salınmalıdır. Avtomatik tam ekran üçün Chrome da lazımdır.

ZIP-ə bunları daxil edin:

```text
WallGrid/
  public/
  data/
    config.json          ← mövcud quruluşu da göndərmək istəyirsinizsə
  server.js
  package.json
  start.bat
  start.sh
  README.md
```

**`.chrome-profile/` qovluğunu göndərməyin.** Bu, yerli brauzer profilidir və giriş sessiyaları kimi şəxsi məlumatlar saxlaya bilər. `.DS_Store` və `.git/` də lazım deyil. `config.backup.json` əvvəlki ayarları ehtiva edir; onu göndərmək məcburi deyil.

Təmiz quruluş göndərmək üçün `data/config.json` faylını ZIP-ə daxil etməyin. Öz kompüterinizdəki faylı silməyə ehtiyac yoxdur. Hazır quruluşu göndərirsinizsə, fayldakı URL və PIN-in də köçürüləcəyini nəzərə alın.

Qarşı tərəfdə:

1. ZIP-i ayrıca, yazıla bilən qovluğa çıxarın; arxivin içindən işə salmayın.
2. Node.js-in işlədiyini `node --version` ilə yoxlayın.
3. `node server.js` və ya sistemə uyğun başlanğıc faylını işə salın.
4. `http://127.0.0.1:8080/edit` açıb ünvanları və monitor düzülüşünü yoxlayın.
5. Daxili saytlara giriş tələb olunursa, həmin kompüterdə ayrıca daxil olun.

`localhost` və `127.0.0.1` ilə başlayan ekran URL-ləri qarşı tərəfin öz kompüterini göstərir. Sizin kompüterdə çalışan başqa xidmətlər ZIP-lə avtomatik köçmür; uyğun ünvanları yeniləmək lazımdır.

## 7. Fiziki monitorlar və şəbəkə

Sətir/sütun ayarı brauzerin daxilini bölür, əməliyyat sistemində fiziki monitorları avtomatik birləşdirmir. Divar üçün brauzer pəncərəsi bütün nəzərdə tutulan ekranları əhatə etməlidir. Sistem və videokartın monitor düzülüşünü ayrıca qurun.

macOS / Linux-da dəqiq pəncərə ölçüsü nümunəsi:

```bash
WALL_W=5760 WALL_H=3240 bash start.sh
```

Windows Command Prompt-da:

```bat
set WALL_W=5760
set WALL_H=3240
start.bat
```

Port 8080 məşğuldursa, macOS / Linux-da:

```bash
PORT=9000 node server.js
```

Windows Command Prompt-da:

```bat
set PORT=9000
node server.js
```

Bu halda brauzerdə `http://127.0.0.1:9000/` açın.

Başqa kompüterdən şəbəkə üzərindən giriş lazım olsa, `HOST=0.0.0.0` ilə başladın (Windows-da əvvəl `set HOST=0.0.0.0`). Digər kompüterdə server kompüterinin IP ünvanını istifadə edin. Firewall icazəsi lazım ola bilər. Bu rejimi yalnız etibarlı şəbəkədə istifadə edin: API üçün ayrıca giriş qoruması yoxdur.

## 8. Tez-tez rast gəlinən hallar

| Problem | Yoxlama |
|---|---|
| `node` tapılmır | Node.js quraşdırılmasını yoxlayın, terminalı yenidən açın |
| Ünvan açılmır | Server terminalı açıqdırmı, düzgün port istifadə olunurmu? |
| `EADDRINUSE` | Port artıq istifadə olunur; əvvəlki serveri dayandırın və ya portu dəyişin |
| Ayarlar saxlanmır | Paneli genişləndirib statusa baxın; `data/` qovluğuna yazı icazəsini yoxlayın |
| Ekran boşdur və ya sayt qoşulmaqdan imtina edir | URL-ni ayrıca tabda açın; sayt iframe daxilində göstərilməni qadağan edə bilər |
| Sayt ayrıca tabda açılır, divarda açılmır | Saytın rəsmi embed ünvanını istifadə edin və ya idarə etdiyiniz saytın iframe icazəsini yoxlayın |
| Ekranın arxasında panel qalır | Paneli WallGrid yazısından sürüşdürün və ya yığcamlaşdırın |
| Köçürülmüş layihədə saytlar açılmır | VPN, şəbəkə, giriş sessiyası və localhost ünvanlarını yoxlayın |

Bəzi saytlar `X-Frame-Options` və ya `CSP frame-ancestors` qaydaları ilə iframe istifadəsini bloklayır. WallGrid bu saytların açılmasına zəmanət vermir.


## 9. Hazır embed kodu əlavə etmək

1. `/edit` açın və istədiyiniz ekrana klikləyin.
2. **Məzmun növü → Embed kodu** seçin.
3. Saytdan götürdüyünüz hazır `<iframe ...></iframe>` kodunu sahəyə yapışdırın.
4. **Tətbiq et** basın; uğurlu saxlamadan sonra yan panel bağlanır. Sonra **Bitir ✓** basın.

Kodda bir iframe və etibarlı HTTP/HTTPS `src` ünvanı olmalıdır. Ölçü ekranın sahəsinə uyğunlaşdırılır; mənbə ünvanındakı parametrlər saxlanılır. Kodun digər HTML elementləri, hadisə atributları və scriptləri icra edilmir. Script və ya `srcdoc` tələb edən embed formatları dəstəklənmir; səhv kod üçün ayarlar panelində xəbərdarlıq görünür.

Adi linklər avtomatik embed linkinə çevrilmir. **Link (URL)** seçimi əvvəlki qaydada işləyir. Növlər arasında keçəndə əvvəl yazılmış URL və embed kodu saxlanılır, yalnız seçilmiş növ göstərilir. Embed kodu da Export / Import və `data/config.json` vasitəsilə köçürülür.

Embed videonun və ya saytın yerləşdirmə icazəsini dəyişmir; mənbə tərəfindən bloklanan məzmun yenə açılmaya bilər.


## 10. İstifadəçilərin ekran məzmunlarını dəyişməsi

`/edit` → **Ayarlar** bölməsində **İstifadəçilər məzmunun yerini dəyişə bilsin** seçimini aktiv edin. Standart olaraq bağlıdır.

**Bitir** basdıqdan sonra ekranların sol yuxarı küncündə kiçik **⠿ ⇄** tutacağı görünür. Ondan tutub başqa ekranın üzərinə buraxın: iki ekranın məzmunları dəyişəcək. Böyük və kiçik ekran arasında da işləyir; ölçü və mövqelər dəyişmir. URL/embed kodu, ad, miqyas və yenilənmə ayarları məzmunla birlikdə keçir. Boş sahəyə buraxmaq heç nə dəyişmir.

Dəyişiklik avtomatik fayla saxlanır. Seçimi söndürəndə baxış rejimində bu tutacaqlar gizlənir. Bu seçim redaktə icazəsi vermir; yalnız iki mövcud ekranın məzmununu dəyişməyə imkan yaradır.


## 11. İnterfeys dili

`/edit` → **Ayarlar → Dil**: Azərbaycan dili (AZ), English (EN), Русский (RU). Başlanğıc dili AZ-dir; seçim `data/config.json` daxilində `language` olaraq saxlanır və növbəti açılışda tətbiq edilir. Digər baxış cihazları da serverdə saxlanmış dili götürür. Düymələr, izahlar, şablonlar və bildirişlər tərcümə olunur. İstifadəçinin ekran adları, URL-lər və embed məzmunu dəyişdirilmir.

Tərcümələr ayrıca `public/lang/az.json`, `public/lang/en.json`, `public/lang/ru.json` fayllarındadır. Açarlar eyni qalmalıdır; yalnız qarşılarındakı mətnləri redaktə edin. Dəyişiklikdən sonra səhifəni yeniləyin.

Məzmun təyin edilmiş ekranlarda redaktə zamanı böyük ekran adı gizlənir. Mənbə ünvanı aşağı zolaqda görünür, seçilib kopyalana bilər. Boş ekranların adları görünməyə davam edir.


## 12. Tətbiq və yüklənmə göstəriciləri

Yan paneldə ad, URL, embed kodu, miqyas və yenilənmə ayarlarını dəyişdikdə onlar **Tətbiq et** basılana qədər saxlanılmır. Paneli bağlasanız, tətbiq edilməmiş dəyişikliklər atılır. Tətbiq zamanı düymədə fırlanan göstərici və saxlanma mesajı görünür. Server saxlamanı təsdiqlədikdə panel bağlanır. Xəta olsa, panel açıq qalır və yenidən cəhd edə bilərsiniz.

Ekranın məzmunu açılarkən həm redaktə, həm baxış rejimində **Yüklənir…** göstəricisi görünür. 15 saniyədən uzun gözləmədə mənbəni yoxlama mesajı çıxır. Brauzer iframe yüklənməsinin bitdiyini bildirəndə göstərici gizlənir; bu, xarici saytın daxilində bütün videoların işlədiyinə zəmanət deyil.
