// ===== Data menu: [emoji, nama, harga, warna latar] =====
var P = [
  // [emoji, nama, harga, warna latar, kategori, terlaris?, file foto]
  // Foto dicari di folder "foto/". Kalau file belum ada, otomatis tampil emoji.
  ["🍰", "Cake", 45000, "#ffd6e7", "dessert", true, "foto/cake.png"],
  ["🧁", "Cupcake", 18000, "#b8f0d8", "dessert", true, "foto/cupcake.png"],
  ["🍩", "Donat", 12000, "#ffe48a", "dessert", true, "foto/donat-glaze.png"],
  ["🍮", "Puding Karamel", 15000, "#d9ccff", "dessert", false, "foto/puding-karamel.png"],
  ["🍪", "Cookies", 2500, "#ffcfa8", "dessert", false, "foto/cookies-mix.png"],
  ["🎂", "Tiramisu", 12000, "#ffd6e7", "dessert", true, "foto/tiramisu.png"],
  ["🍦", "Mochi", 1400, "#b8f0d8", "dessert", false, "foto/mochi.png"],
  ["🥧", "pancake", 3500, "#ffe48a", "dessert", false, "foto/pancake.png"],
  ["☕", "Kopi Susu", 18000, "#ffcfa8", "drink", false, "foto/kopi-susu.png"],
  ["🧋", "Boba Milk Tea", 20000, "#d9ccff", "drink", true, "foto/boba-milk-tea.png"],
  ["🍓", "Strawberry Smoothie", 22000, "#ffd6e7", "drink", false, "foto/strawberry-smoothie.png"],
  ["🍵", "Matcha Latte", 22000, "#b8f0d8", "drink", true, "foto/matcha-latte.png"],
  ["🥤", "Es Teh Lemon", 10000, "#ffe48a", "drink", false, "foto/es-teh-lemon.png"],
  ["🍫", "Cokelat Hangat", 18000, "#ffcfa8", "drink", false, "foto/cokelat-hangat.png"]
];

// Isi keranjang: { nomorMenu: jumlah }
var cart = {};

// ===== Fungsi bantu =====
function $(id) {
  return document.getElementById(id);
}

// Jalankan satu bagian dengan aman: kalau elemennya sudah kamu hapus dari HTML,
// bagian itu dilewati dan TIDAK menghentikan bagian lain (animasi, navigasi, dll).
function aman(fn) {
  try { fn(); } catch (e) { console.warn("Bagian dilewati:", e.message); }
}

function rp(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

// Mencegah teks pembeli merusak HTML
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

// ===== Menampilkan kartu menu (tab: dessert / minuman / terlaris, atau hasil pencarian) =====
var tab = "dessert";

function setTab(t) {
  tab = t;
  if ($("q")) $("q").value = "";
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.classList.toggle("on", b.dataset.t === t);
  });
  renderGrid("");
}

function renderGrid(q) {
  var html = P.map(function (p, i) {
    var cocok = q ? p[1].toLowerCase().indexOf(q) > -1 : (tab === "best" ? p[5] : p[4] === tab);
    if (!cocok) return "";
    return (
      '<div class="card">' +
        (p[5] ? '<span class="star">⭐ Terlaris</span>' : "") +
        '<div class="em" style="background:' + p[3] + '">' + p[0] +
          '<img src="' + p[6] + '" alt="' + p[1] + '" onerror="this.remove()"></div>' +
        "<h3>" + p[1] + "</h3>" +
        '<div class="price">' + rp(p[2]) + "</div>" +
        '<button class="btn" onclick="add(' + i + ',1)">+ Keranjang</button>' +
      "</div>"
    );
  }).join("");

  $("grid").innerHTML = html || '<div class="empty">Menu tidak ditemukan 🍰</div>';
}

function search() {
  renderGrid($("q").value.trim().toLowerCase());
  goSection("menu");
}

// ===== Navigasi: pindah bagian & garis merah yang ikut bergeser =====
// ("promo" = bagian Paket Spesial, id-nya sengaja dipertahankan)
var URUTAN = ["beranda", "menu", "promo", "testi", "contact"];
var navAktif = "";
var kunci = false;   // dikunci saat halaman sedang digulir otomatis (klik navigasi)
var timerKunci;

function isHP() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function setNav(id, paksa) {
  if (id === navAktif && !paksa) return;
  navAktif = id;

  var aktif = null;
  document.querySelectorAll(".links [data-s]").forEach(function (b) {
    var on = b.dataset.s === id;
    b.classList.toggle("on", on);
    if (on) aktif = b;
  });
  if (!aktif) return;

  // Garis merah meluncur ke bawah tautan yang aktif
  var garis = $("slider");
  garis.style.width = aktif.offsetWidth + "px";
  garis.style.transform = "translateX(" + aktif.offsetLeft + "px)";

  // Di HP daftar navigasi bisa digeser: bawa tautan aktif ke tengah
  var daftar = $("links");
  daftar.scrollTo({
    left: aktif.offsetLeft - (daftar.clientWidth - aktif.offsetWidth) / 2,
    behavior: "smooth"
  });
}

function bukaKunci() {
  clearTimeout(timerKunci);
  timerKunci = setTimeout(function () {
    kunci = false;
    cekBagian();
  }, 200);
}

// Cek bagian mana yang sedang tampil, lalu geser garis merahnya
function cekBagian() {
  if (kunci) { bukaKunci(); return; }

  var acuan = document.querySelector("header").getBoundingClientRect().bottom + 80;
  var aktif = URUTAN[0];
  URUTAN.forEach(function (id) {
    var bagian = $(id);
    if (bagian && bagian.getBoundingClientRect().top <= acuan) aktif = id;
  });

  // Mentok di paling bawah: anggap bagian terakhir (kontak) yang aktif
  var h = $("home");
  var mentok = isHP()
    ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
    : h.scrollTop + h.clientHeight >= h.scrollHeight - 4;
  if (mentok) {
    for (var i = URUTAN.length - 1; i >= 0; i--) {
      if ($(URUTAN[i])) { aktif = URUTAN[i]; break; }
    }
  }

  setNav(aktif);
  document.body.classList.toggle("in-menu", aktif === "menu");
}

// Klik navigasi: garis langsung pindah, halaman menggulir halus ke bagiannya
function goSection(id) {
  kunci = true;
  bukaKunci();
  setNav(id);
  $(id).scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== Pop-up (data pengiriman & terima kasih) =====
function openModal(id) {
  closeModal();
  $(id).classList.add("open");
}

function closeModal() {
  document.querySelectorAll(".modal").forEach(function (m) {
    m.classList.remove("open");
  });
}

// ===== Keranjang =====
function add(i, d) {
  cart[i] = (cart[i] || 0) + d;
  if (d > 0) hop();
  if (cart[i] <= 0) delete cart[i];
  draw();
}

function total() {
  return Object.keys(cart).reduce(function (sum, i) {
    return sum + P[i][2] * cart[i];
  }, 0);
}

function draw() {
  var k = Object.keys(cart);

  // Jumlah barang di ikon keranjang
  $("cnt").textContent = k.reduce(function (sum, i) {
    return sum + cart[i];
  }, 0);

  // Ucapan si kucing
  if ($("cmsg")) {
    $("cmsg").textContent = k.length
      ? "Yey! ada " + $("cnt").textContent + " item 🐾"
      : "Meong~ keranjangnya masih kosong";
  }

  // Daftar di panel keranjang (halaman menu)
  $("items").innerHTML = k.length
    ? k.map(function (i) {
        return (
          '<div class="row">' +
            "<span>" + P[i][0] + " " + P[i][1] + "</span>" +
            '<button class="q" onclick="add(' + i + ',-1)">−</button>' +
            "<b>" + cart[i] + "</b>" +
            '<button class="q" onclick="add(' + i + ',1)">+</button>' +
          "</div>"
        );
      }).join("")
    : '<div class="empty">Keranjang masih kosong 🧺</div>';

  // Ringkasan di halaman data pengiriman
  $("sumItems").innerHTML =
    k.map(function (i) {
      return (
        '<div class="row"><span>' + P[i][0] + " " + P[i][1] + "</span>" +
        "<b>×" + cart[i] + "</b></div>"
      );
    }).join("") || '<div class="empty">Belum ada pesanan</div>';

  $("tot").textContent = $("tot2").textContent = rp(total());

  // Bar keranjang melayang (khusus HP)
  aman(function () {
    var n = Number($("cnt").textContent);
    $("cbCnt").textContent = n;
    $("cbTot").textContent = rp(total());
    $("cartbar").classList.toggle("has", n > 0);
  });
}

// Ke halaman form hanya jika keranjang sudah ada isinya
function goCart() {
  // Keranjang kosong: bawa ke menu supaya mulai memilih
  if (!Object.keys(cart).length) {
    goSection(isHP() ? "keranjang" : "menu");
    hop();
    return;
  }
  openModal("checkout");
}

// ===== Form pengiriman =====
$("f").addEventListener("submit", function (e) {
  e.preventDefault();

  $("tMsg").innerHTML =
    "Terima kasih, " + esc($("nama").value) +
    "! Pesananmu dikirim ke " + esc($("alamat").value) + " 🚚";

  cart = {};
  $("f").reset();
  draw();
  openModal("thanks");
});

// ===== Kursor foto =====
// Taruh fotomu di folder "foto" dengan nama di bawah ini. Kalau namanya beda, ganti di sini
// (contoh: "foto/kucingku.jpg"). Kalau filenya tidak ada, kursor tetap biasa.
var FOTO_KURSOR = "foto/kursor.png";

var cur = $("cur");
var pic = $("pic");
var sudahGerak = false;
var fotoBawaanAda = false;

// Dimatikan di layar sentuh (HP/tablet tidak punya kursor)
var adaMouse = !window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// Pasang foto sebagai kursor
function pasangKursor(src) {
  cur.style.backgroundImage = "url('" + src + "')";
  cur.style.display = "block";
  cur.style.opacity = sudahGerak ? 1 : 0;  // baru tampil setelah mouse digerakkan
  document.body.classList.add("pc");
}

// Kembali ke kursor biasa
function lepasKursor() {
  cur.style.display = "none";
  document.body.classList.remove("pc");
}

document.addEventListener("mousemove", function (e) {
  if (!cur) return;
  cur.style.left = e.clientX + "px";
  cur.style.top = e.clientY + "px";
  if (!sudahGerak) {
    sudahGerak = true;
    cur.style.opacity = 1;
  }
});

// Otomatis: saat halaman dibuka, foto bawaan langsung jadi kursor
if (adaMouse && cur) {
  var tes = new Image();
  tes.onload = function () {
    fotoBawaanAda = true;
    pasangKursor(FOTO_KURSOR);
  };
  tes.src = FOTO_KURSOR;  // kalau file tidak ada, tidak terjadi apa-apa
}

// Tombol 📷: ganti dengan foto lain (sementara, hilang saat halaman di-refresh)
if (pic) pic.addEventListener("change", function () {
  var f = pic.files[0];
  if (!f) return;

  var r = new FileReader();
  r.onload = function () {
    pasangKursor(r.result);
    if ($("resetCur")) $("resetCur").classList.remove("hide");
  };
  r.readAsDataURL(f);
});

// Tombol ✖: kembali ke foto bawaan (atau kursor biasa kalau foto bawaan tidak ada)
function resetCur() {
  if (pic) pic.value = "";
  if ($("resetCur")) $("resetCur").classList.add("hide");
  if (fotoBawaanAda) pasangKursor(FOTO_KURSOR);
  else lepasKursor();
}


// ===== Kucing di keranjang =====
var kucing = $("kucing");

// Melompat setiap kali ada dessert/minuman masuk
function hop() {
  if (!kucing) return;
  kucing.classList.remove("hop");
  void kucing.offsetWidth; // paksa animasi mulai ulang
  kucing.classList.add("hop");
}

// Saat dipencet: melompat kecil dan tersenyum selama ditekan
if (kucing) {
  ["mousedown", "touchstart"].forEach(function (ev) {
    kucing.addEventListener(ev, function () {
      kucing.classList.add("happy");
      hop();
    });
  });
  ["mouseup", "mouseleave", "touchend"].forEach(function (ev) {
    kucing.addEventListener(ev, function () { kucing.classList.remove("happy"); });
  });
}

// ===== Animasi muncul saat di-scroll =====
function initReveal() {
  var els = document.querySelectorAll(".reveal");

  // Browser lama: langsung tampilkan semuanya
  if (!("IntersectionObserver" in window)) {
    els.forEach(function (e) { e.classList.add("show"); });
    return;
  }

  var io = new IntersectionObserver(function (list) {
    list.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add("show");
        io.unobserve(en.target);
      }
    });
  }, { root: isHP() ? null : $("home"), threshold: 0.2 });

  els.forEach(function (e) { io.observe(e); });
}

// ===== Paket Spesial (tampilan voucher) =====
// Isi paket: [nomor menu di array P, jumlah].
// Nomor menu = urutan di array P di atas (0 = Cake, 1 = Cupcake, 2 = Donat, ...).
// Nama dan harga dibaca dari P, jadi kalau harga menu berubah, harga paket ikut berubah.
var PAKET = [
  { ikon: "🧋", nama: "Paket Berdua", isi: [[9, 1], [11, 1], [1, 2]] },  // Boba + Matcha Latte + 2 Cupcake
  { ikon: "🍩", nama: "Paket Ngemil", isi: [[2, 4], [12, 2]] },          // 4 Donat + 2 Es Teh Lemon
  { ikon: "🎂", nama: "Paket Pesta",  isi: [[0, 1], [1, 4], [9, 2]] }    // Cake + 4 Cupcake + 2 Boba
];

function hargaPaket(p) {
  return p.isi.reduce(function (sum, x) {
    return sum + P[x[0]][2] * x[1];
  }, 0);
}

function renderPaket() {
  var wadah = $("paketList");
  if (!wadah) return;

  wadah.innerHTML = PAKET.map(function (p, n) {
    var isi = p.isi.map(function (x) {
      return x[1] + " " + P[x[0]][1];
    }).join(" + ");

    return (
      '<div class="voucher">' +
        '<div class="vc-top">' + p.ikon + " " + p.nama + "</div>" +
        '<div class="vc-body">' +
          '<div class="vc-price">' + rp(hargaPaket(p)) + "</div>" +
          '<button class="vc-go" onclick="pesanPaket(' + n + ', this)" ' +
            'aria-label="Tambah ' + p.nama + ' ke keranjang" title="Tambah ke keranjang">+</button>' +
        "</div>" +
        '<div class="vc-foot"><span class="vc-ic">🛍️</span><span>Isi: <b>' + isi + "</b></span></div>" +
      "</div>"
    );
  }).join("");
}

// Memasukkan semua isi paket ke keranjang lewat fungsi add() di atas
function pesanPaket(n, tombol) {
  PAKET[n].isi.forEach(function (x) {
    add(x[0], x[1]);
  });

  tombol.textContent = "✓";
  tombol.classList.add("ok");
  setTimeout(function () {
    tombol.textContent = "+";
    tombol.classList.remove("ok");
  }, 1500);
}

// ===== Jalankan saat halaman dibuka =====
renderGrid("");
draw();
aman(renderPaket);

// ===== Tombol "info lainnya" di beranda =====
function infoCara() {
  alert(
    "Cara pesan:\n" +
    "1. Pilih dessert di menu\n" +
    "2. Isi nama & alamat\n" +
    "3. Kirim pesanan, selesai!"
  );
}
aman(initReveal);

// ===== Garis navigasi mengikuti scroll =====
$("home").addEventListener("scroll", cekBagian, { passive: true });  // komputer
window.addEventListener("scroll", cekBagian, { passive: true });     // HP
window.addEventListener("resize", function () { setNav(navAktif, true); cekBagian(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
aman(cekBagian);

// Tahun di footer otomatis
if ($("thn")) $("thn").textContent = new Date().getFullYear();

// Jumlah menu di bagian "Tentang Toko Kami" mengikuti daftar menu
if ($("statMenu")) $("statMenu").textContent = P.length;

// ===== Komentar pelanggan: slider + form =====
var KOMENTAR_AWAL = [
  { nama: "Sari",  bintang: 5, avatar: "👩",   teks: "Kuenya lembut banget dan lucu! Pesan kejutan buat bestie langsung dibalas senyum 🥰" },
  { nama: "Budi",  bintang: 5, avatar: "🧑",   teks: "Boba milk tea-nya juara, kirimnya cepat. Pasti pesan lagi!" },
  { nama: "Nadia", bintang: 4, avatar: "👧",   teks: "Cupcake bikin anak-anak suka. Hadiahnya jadi makin spesial." },
  { nama: "Rina",  bintang: 5, avatar: "👩‍🦰", teks: "Donatnya enak dan tidak terlalu manis. Recommended!" }
];
var komentarKu = [];   // komentar yang ditulis pengunjung (tersimpan di browser ini saja)
try { komentarKu = JSON.parse(localStorage.getItem("komentarKu")) || []; } catch (e) { komentarKu = []; }

var tIdx = 0;          // posisi slider
var tNilai = 5;        // bintang yang dipilih di form
var tJeda = false;     // slider berhenti sementara saat disentuh kursor / form diisi

function tPerView() {
  var w = window.innerWidth;
  return w < 700 ? 1 : (w < 1000 ? 2 : 3);
}

function tHalaman() {
  return Math.max(1, komentarKu.length + KOMENTAR_AWAL.length - tPerView() + 1);
}

function renderKomentar() {
  var track = $("tTrack");
  if (!track) return;

  track.innerHTML = komentarKu.concat(KOMENTAR_AWAL).map(function (k, i) {
    return (
      '<div class="tslide"><div class="tcard">' +
        '<span class="tq">“</span>' +
        '<div class="stars">' + "★★★★★".slice(0, k.bintang) + "☆☆☆☆☆".slice(0, 5 - k.bintang) + "</div>" +
        "<p>" + esc(k.teks) + "</p>" +
        '<div class="who"><span class="av">' + esc(k.avatar) + "</span>" + esc(k.nama) +
          (i < komentarKu.length ? '<span class="tbadge">dari kamu 💖</span>' : "") +
        "</div>" +
      "</div></div>"
    );
  }).join("");

  var hal = tHalaman();
  $("tDots").innerHTML = Array.apply(null, Array(hal)).map(function (_, i) {
    return '<button aria-label="Komentar ' + (i + 1) + '" onclick="tKe(' + i + ')"></button>';
  }).join("");

  tKe(Math.min(tIdx, hal - 1));
}

function tKe(i) {
  tIdx = i;
  $("tTrack").style.setProperty("--pv", tPerView());
  $("tTrack").style.transform = "translateX(" + (-tIdx * 100 / tPerView()) + "%)";
  document.querySelectorAll("#tDots button").forEach(function (d, n) {
    d.classList.toggle("on", n === tIdx);
  });
}

function tGeser(arah) {
  tKe((tIdx + arah + tHalaman()) % tHalaman());
}

// Bintang di form
function tAturBintang(n) {
  tNilai = n;
  document.querySelectorAll("#tStars .tstar").forEach(function (b) {
    b.classList.toggle("on", Number(b.dataset.v) <= n);
  });
}

aman(function () {
  renderKomentar();
  $("tPrev").addEventListener("click", function () { tGeser(-1); });
  $("tNext").addEventListener("click", function () { tGeser(1); });
  window.addEventListener("resize", renderKomentar);

  // Jalan sendiri tiap 4,5 detik; berhenti saat kursor di atasnya atau form sedang diisi
  $("tSlider").addEventListener("mouseenter", function () { tJeda = true; });
  $("tSlider").addEventListener("mouseleave", function () { tJeda = false; });
  $("tForm").addEventListener("focusin", function () { tJeda = true; });
  $("tForm").addEventListener("focusout", function () { tJeda = false; });
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(function () { if (!tJeda) tGeser(1); }, 4500);
  }

  document.querySelectorAll("#tStars .tstar").forEach(function (b) {
    b.addEventListener("click", function () { tAturBintang(Number(b.dataset.v)); });
  });

  $("tForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var nama = $("tNama").value.trim();
    var isi = $("tIsi").value.trim();
    if (!nama || !isi) {
      $("tNote").textContent = "Isi nama dan komentarmu dulu ya 💕";
      return;
    }

    var av = document.querySelector("input[name=tAv]:checked");
    komentarKu.unshift({ nama: nama.slice(0, 30), bintang: tNilai, avatar: av ? av.value : "😊", teks: isi.slice(0, 200) });
    komentarKu = komentarKu.slice(0, 30);
    try { localStorage.setItem("komentarKu", JSON.stringify(komentarKu)); } catch (err) { /* penyimpanan dimatikan */ }

    tIdx = 0;
    renderKomentar();
    $("tForm").reset();
    tAturBintang(5);
    $("tNote").textContent = "Terima kasih, " + nama.slice(0, 30) + "! Komentarmu sudah muncul di atas ✨";
    $("tSlider").scrollIntoView({ behavior: "smooth", block: "center" });
  });
});