// ===== Struk pesanan + opsi pengiriman & pembayaran =====
// Pasang SETELAH Dessert.js di index.html:
//   <script src="Dessert.js"></script>
//   <script src="Struk.js"></script>
//
// File ini menambahkan sendiri pilihan "Antar / Ambil" dan "Tunai / QR" ke form pengiriman,
// jadi index.html dan Dessert.js TIDAK perlu diubah.
// Memakai P, cart, total(), rp(), esc(), $() dan openModal() dari Dessert.js.

var NAMA_TOKO = "Sweetie Treats";
var ALAMAT_TOKO = "Jl. Manis No. 1";

// Isi dengan nomor WhatsApp toko (tanpa +, tanpa spasi, diawali 62), contoh: "6281234567890".
// Kalau dikosongkan, tombol "Kirim ke WhatsApp" tidak ditampilkan.
var NOMOR_WA = "";

// ===== Pengaturan ongkir (hitung manual: tinggal ubah angka di bawah) =====
var ONGKIR_DASAR = 5000;     // tarif untuk jarak sampai ONGKIR_KM_DASAR
var ONGKIR_KM_DASAR = 2;     // km pertama yang masuk tarif dasar
var ONGKIR_PER_KM = 2500;    // tambahan per km (dibulatkan ke atas) setelah km dasar
var ONGKIR_MAKS_KM = 20;     // batas jarak antar

var dataStruk = null;   // salinan pesanan terakhir (keranjang sudah dikosongkan oleh Dessert.js)

// ===== Gaya (dipakai di halaman dan di jendela cetak) =====
var CSS_STRUK = `
.struk-wrap { width: 100%; display: grid; gap: 10px; justify-items: center; }

.struk {
  position: relative;
  width: 100%;
  max-width: 340px;
  margin-bottom: 8px;
  padding: 16px 16px 20px;
  text-align: left;
  font-family: "Courier New", Courier, monospace;
  font-size: .82rem;
  line-height: 1.35;
  color: #333;
  background: #fff;
  border-radius: 6px 6px 0 0;
  box-shadow: 0 6px 16px #5a2d4a33;
}

/* tepi bawah bergerigi seperti kertas struk */
.struk::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 8px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='8' viewBox='0 0 14 8'%3E%3Cpath d='M0 0L7 8L14 0Z' fill='white'/%3E%3C/svg%3E") repeat-x;
  background-size: 14px 8px;
}

.st-head { text-align: center; margin-bottom: 6px; }
.st-head b { display: block; font-size: 1rem; letter-spacing: .5px; }
.st-head small { display: block; opacity: .7; }

.st-line { margin: 8px 0; border-top: 2px dashed #bbb; }

.st-row { display: flex; justify-content: space-between; gap: 10px; }
.st-row span:first-child { flex: none; opacity: .7; }
.st-row b { text-align: right; font-weight: 700; word-break: break-word; }

.st-items { display: grid; gap: 6px; max-height: 30vh; overflow: auto; }
.st-item { display: grid; grid-template-columns: 1fr auto; column-gap: 10px; }
.st-item small { grid-column: 1 / -1; opacity: .65; }

.st-sum { display: flex; justify-content: space-between; }
.st-total { display: flex; justify-content: space-between; font-size: 1rem; font-weight: 700; }
.st-foot { margin-top: 8px; text-align: center; font-size: .76rem; opacity: .75; }

/* kotak QR (demo) */
.st-qr { text-align: center; }
.st-qr svg { width: 150px; height: 150px; display: block; margin: 6px auto; }
.st-qr small { display: block; opacity: .7; }
.st-qr .st-demo { display: inline-block; margin-top: 4px; padding: 1px 8px; border: 1px dashed #c2417a; color: #c2417a; font-weight: 700; opacity: 1; }

.struk-aksi { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.struk-aksi .btn { padding: 6px 14px; font-size: .85rem; }

/* emoji dan judul di pop-up terima kasih dikecilkan supaya struk muat */
#thanks .mbox.thanks > div:first-child { font-size: 3rem !important; }
#thanks .mbox.thanks h2 { margin: 0; font-size: 1.25rem; }

/* pilihan tambahan di form pengiriman */
.opsi-grup { display: grid; gap: 3px; font-weight: 700; font-size: .95rem; }
.opsi-grup small { font-weight: 400; opacity: .75; }
.choice label:has(input:checked) { background: var(--pink); color: #fff; }
.sum .row.ongkir b { white-space: nowrap; }

/* tampilan di jendela cetak */
body.cetak { margin: 0; padding: 8px; background: #fff; }
.cetak .struk { max-width: 80mm; margin: 0 auto; font-size: 11px; box-shadow: none; }
.cetak .struk::after { display: none; }
.cetak .st-items { max-height: none; overflow: visible; }
`;

// Pasang gaya ke halaman
(function () {
  var s = document.createElement("style");
  s.id = "struk-css";
  s.textContent = CSS_STRUK;
  document.head.appendChild(s);
})();

// ===== QR palsu (khusus demo, TIDAK bisa di-scan) =====
// Pola acak yang selalu sama untuk nomor pesanan yang sama, dengan 3 kotak sudut seperti QR asli.
function hashTeks(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function acak(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function qrPalsu(teks) {
  var N = 25, Q = 3, r = acak(hashTeks(teks));
  var sudut = [[0, 0], [N - 7, 0], [0, N - 7]];

  function diSudut(x, y) {
    return sudut.some(function (c) {
      return x >= c[0] - 1 && x <= c[0] + 7 && y >= c[1] - 1 && y <= c[1] + 7;
    });
  }

  function gelapSudut(x, y) {
    for (var i = 0; i < sudut.length; i++) {
      var dx = x - sudut[i][0], dy = y - sudut[i][1];
      if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
    }
    return false;
  }

  var d = "";
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      var gelap = diSudut(x, y) ? gelapSudut(x, y) : r() > 0.5;
      if (gelap) d += "M" + (x + Q) + " " + (y + Q) + "h1v1h-1z";
    }
  }

  var ukuran = N + Q * 2;
  return (
    '<svg viewBox="0 0 ' + ukuran + " " + ukuran + '" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="' + ukuran + '" height="' + ukuran + '" fill="#fff"/>' +
      '<path d="' + d + '" fill="#222"/>' +
    "</svg>"
  );
}

// ===== Ongkir =====
function hitungOngkir(km) {
  if (!(km > 0)) return 0;
  if (km <= ONGKIR_KM_DASAR) return ONGKIR_DASAR;
  return ONGKIR_DASAR + Math.ceil(km - ONGKIR_KM_DASAR) * ONGKIR_PER_KM;
}

// ===== Menambah pilihan ke form pengiriman =====
function pilihan(nama) {
  var el = document.querySelector("input[name=" + nama + "]:checked");
  return el ? el.value : "";
}

function pasangOpsiForm() {
  var f = $("f");
  var alamatLabel = $("alamat") && $("alamat").closest("label");
  if (!f || !alamatLabel) return;

  // 1) Antar atau ambil: sebelum kolom alamat
  var ambil = document.createElement("div");
  ambil.className = "opsi-grup";
  ambil.innerHTML =
    "Pengambilan" +
    '<div class="choice">' +
      '<label><input type="radio" name="ambil" value="antar" checked> 🚚 Antar ke rumah</label>' +
      '<label><input type="radio" name="ambil" value="ambil"> 🏪 Ambil di toko</label>' +
    "</div>";
  f.insertBefore(ambil, alamatLabel);

  // 2) Jarak (untuk ongkir): sesudah kolom alamat
  var jarak = document.createElement("label");
  jarak.id = "jarakLabel";
  jarak.innerHTML =
    "Perkiraan jarak ke alamat (km)" +
    '<input id="jarak" type="number" min="0.5" max="' + ONGKIR_MAKS_KM + '" step="0.5" value="2">' +
    '<small id="ongkirInfo" style="font-weight:400;opacity:.75"></small>';
  f.insertBefore(jarak, alamatLabel.nextSibling);

  // 3) Metode pembayaran: sebelum tombol kirim
  var bayar = document.createElement("div");
  bayar.className = "opsi-grup";
  bayar.innerHTML =
    "Pembayaran" +
    '<div class="choice">' +
      '<label><input type="radio" name="bayar" value="tunai" checked> 💵 Tunai</label>' +
      '<label><input type="radio" name="bayar" value="qr"> 📱 Non-tunai (QR)</label>' +
    "</div>" +
    '<small id="bayarInfo"></small>';
  var kirim = f.querySelector("button[type=submit]");
  f.insertBefore(bayar, kirim);

  // 4) Ringkasan: subtotal + ongkir + total bayar
  var sum = document.querySelector("#checkout .sum");
  var totalLama = sum && sum.querySelector(".total");
  if (totalLama) {
    totalLama.innerHTML = 'Subtotal: <span id="tot2">' + rp(total()) + "</span>";

    var rowOngkir = document.createElement("div");
    rowOngkir.className = "row ongkir";
    rowOngkir.id = "rowOngkir";
    rowOngkir.innerHTML = "<span>🚚 Ongkir</span><b id=\"ongkirNilai\">Rp 0</b>";

    var totalBayar = document.createElement("div");
    totalBayar.className = "total";
    totalBayar.innerHTML = 'Total bayar: <span id="totBayar">Rp 0</span>';

    sum.insertBefore(rowOngkir, totalLama);
    sum.appendChild(totalBayar);
  }

  f.addEventListener("input", segarkan);
  f.addEventListener("change", segarkan);
  f.addEventListener("reset", function () { setTimeout(segarkan, 0); });
  segarkan();
}

// Hitung ulang ongkir, total, dan tampilan kolom sesuai pilihan
function segarkan() {
  if (!$("jarak")) return;

  var antar = pilihan("ambil") !== "ambil";
  var qr = pilihan("bayar") === "qr";

  $("alamat").closest("label").classList.toggle("hide", !antar);
  $("alamat").required = antar;
  $("jarakLabel").classList.toggle("hide", !antar);
  $("jarak").required = antar;

  var km = parseFloat($("jarak").value);
  var ongkir = antar ? hitungOngkir(km) : 0;

  $("ongkirInfo").textContent =
    "Tarif: " + rp(ONGKIR_DASAR) + " sampai " + ONGKIR_KM_DASAR + " km, lalu + " + rp(ONGKIR_PER_KM) + "/km.";
  $("bayarInfo").textContent = qr
    ? "Kode QR muncul di struk setelah pesanan dikirim."
    : (antar ? "Bayar tunai ke kurir saat pesanan tiba." : "Bayar tunai di kasir saat mengambil pesanan.");

  if ($("rowOngkir")) {
    $("rowOngkir").classList.toggle("hide", !antar);
    $("ongkirNilai").textContent = rp(ongkir);
  }
  if ($("totBayar")) $("totBayar").textContent = rp(total() + ongkir);
}

// Ringkasan harus dihitung ulang setiap pop-up data pengiriman dibuka
(function () {
  var openModalAsli = openModal;
  openModal = function (id) {
    openModalAsli(id);
    if (id === "checkout") segarkan();
  };
})();

// ===== Isi struk =====
function nomorPesanan(waktu) {
  var p = function (n) { return String(n).padStart(2, "0"); };
  return "ST-" + waktu.getFullYear() + p(waktu.getMonth() + 1) + p(waktu.getDate()) +
         "-" + (100 + Math.floor(Math.random() * 900));
}

function isiStruk(d) {
  var tgl = d.waktu.toLocaleString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  var item = d.item.map(function (it) {
    return (
      '<div class="st-item">' +
        "<span>" + esc(it.nama) + "</span>" +
        "<b>" + rp(it.harga * it.jumlah) + "</b>" +
        "<small>" + it.jumlah + " × " + rp(it.harga) + "</small>" +
      "</div>"
    );
  }).join("");

  var tujuan = d.antar
    ? '<div class="st-row"><span>Alamat</span><b>' + esc(d.alamat) + "</b></div>" +
      '<div class="st-row"><span>Jarak</span><b>' + d.jarak + " km</b></div>"
    : "";

  var qrBlok = d.qr
    ? '<div class="st-line"></div>' +
      '<div class="st-qr">' +
        "<small>Scan untuk membayar " + rp(d.total) + "</small>" +
        qrPalsu(d.nomor) +
        '<small class="st-demo">DEMO · bukan QR asli</small>' +
      "</div>"
    : "";

  return (
    '<div class="st-head"><b>🍓 ' + esc(NAMA_TOKO) + "</b><small>" + esc(ALAMAT_TOKO) + "</small></div>" +
    '<div class="st-line"></div>' +
    '<div class="st-row"><span>No.</span><b>' + esc(d.nomor) + "</b></div>" +
    '<div class="st-row"><span>Waktu</span><b>' + esc(tgl) + "</b></div>" +
    '<div class="st-row"><span>Nama</span><b>' + esc(d.nama) + "</b></div>" +
    '<div class="st-row"><span>Layanan</span><b>' + (d.antar ? "Antar ke rumah" : "Ambil di toko") + "</b></div>" +
    tujuan +
    '<div class="st-row"><span>Bayar</span><b>' + (d.qr ? "Non-tunai (QR)" : "Tunai") + "</b></div>" +
    '<div class="st-row"><span>Status</span><b>' + (d.qr ? "Menunggu pembayaran" : "Bayar saat " + (d.antar ? "diterima" : "ambil")) + "</b></div>" +
    '<div class="st-line"></div>' +
    '<div class="st-items">' + item + "</div>" +
    '<div class="st-line"></div>' +
    '<div class="st-sum"><span>Subtotal</span><span>' + rp(d.subtotal) + "</span></div>" +
    (d.antar ? '<div class="st-sum"><span>Ongkir</span><span>' + rp(d.ongkir) + "</span></div>" : "") +
    '<div class="st-total"><span>TOTAL</span><span>' + rp(d.total) + "</span></div>" +
    qrBlok +
    '<div class="st-line"></div>' +
    '<div class="st-foot">Terima kasih sudah berbelanja! 🍰<br>Simpan struk ini sebagai bukti pesanan.</div>'
  );
}

// ===== Menampilkan struk di pop-up terima kasih =====
function tampilkanStruk() {
  var kotak = document.querySelector("#thanks .mbox");
  if (!kotak || !dataStruk) return;

  var lama = $("struk-wrap");
  if (lama) lama.remove();

  var wrap = document.createElement("div");
  wrap.id = "struk-wrap";
  wrap.className = "struk-wrap";
  wrap.innerHTML =
    '<div class="struk">' + isiStruk(dataStruk) + "</div>" +
    '<div class="struk-aksi">' +
      '<button type="button" class="btn" onclick="cetakStruk()">🖨️ Cetak / simpan PDF</button>' +
      (NOMOR_WA ? '<button type="button" class="btn" onclick="kirimWA()">💬 Kirim ke WhatsApp</button>' : "") +
    "</div>";

  // taruh sebelum tombol "Kembali ke Beranda"
  var tombolKembali = kotak.querySelector("button.big");
  if (tombolKembali) kotak.insertBefore(wrap, tombolKembali);
  else kotak.appendChild(wrap);
}

// ===== Cetak / simpan sebagai PDF =====
function cetakStruk() {
  if (!dataStruk) return;

  var f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);

  var doc = f.contentWindow.document;
  doc.open();
  doc.write(
    '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Struk ' + esc(dataStruk.nomor) +
    "</title><style>" + CSS_STRUK + '</style></head><body class="cetak"><div class="struk">' +
    isiStruk(dataStruk) + "</div></body></html>"
  );
  doc.close();

  f.contentWindow.onafterprint = function () { f.remove(); };
  setTimeout(function () {
    f.contentWindow.focus();
    f.contentWindow.print();
  }, 300);
}

// ===== Kirim pesanan ke WhatsApp toko =====
function kirimWA() {
  var d = dataStruk;
  if (!d || !NOMOR_WA) return;

  var baris = [
    "*Pesanan " + NAMA_TOKO + "*",
    "No: " + d.nomor,
    "Nama: " + d.nama,
    "Layanan: " + (d.antar ? "Antar ke rumah" : "Ambil di toko")
  ];
  if (d.antar) baris.push("Alamat: " + d.alamat, "Jarak: " + d.jarak + " km");
  baris.push("Bayar: " + (d.qr ? "Non-tunai (QR)" : "Tunai"), "");

  d.item.forEach(function (it) {
    baris.push(it.jumlah + "x " + it.nama + " = " + rp(it.harga * it.jumlah));
  });
  baris.push("");
  baris.push("Subtotal: " + rp(d.subtotal));
  if (d.antar) baris.push("Ongkir: " + rp(d.ongkir));
  baris.push("*Total: " + rp(d.total) + "*");

  window.open("https://wa.me/" + NOMOR_WA + "?text=" + encodeURIComponent(baris.join("\n")), "_blank", "noopener");
}

// ===== Menangkap pesanan saat form dikirim =====
// 1) Fase "capture": jalan SEBELUM Dessert.js mengosongkan keranjang, jadi isinya kita salin dulu.
document.addEventListener("submit", function (e) {
  if (!e.target || e.target.id !== "f") return;

  var waktu = new Date();
  var antar = pilihan("ambil") !== "ambil";
  var km = antar ? (parseFloat($("jarak").value) || 0) : 0;
  var sub = total();
  var ongkir = antar ? hitungOngkir(km) : 0;

  dataStruk = {
    nomor: nomorPesanan(waktu),
    waktu: waktu,
    nama: $("nama").value.trim(),
    alamat: antar ? $("alamat").value.trim() : "",
    antar: antar,
    jarak: km,
    qr: pilihan("bayar") === "qr",
    subtotal: sub,
    ongkir: ongkir,
    total: sub + ongkir,
    item: Object.keys(cart).map(function (i) {
      return { nama: P[i][1], harga: P[i][2], jumlah: cart[i] };
    })
  };
}, true);

// 2) Fase "bubble": jalan SESUDAH Dessert.js membuka pop-up terima kasih, lalu struk ditempelkan.
document.addEventListener("submit", function (e) {
  if (!e.target || e.target.id !== "f" || !dataStruk) return;

  // Sesuaikan kalimat terima kasih dengan pilihan pembeli
  var kalimat = "Terima kasih, " + esc(dataStruk.nama) + "! ";
  kalimat += dataStruk.antar
    ? "Pesananmu dikirim ke " + esc(dataStruk.alamat) + " 🚚"
    : "Pesananmu siap diambil di toko 🏪";
  if (dataStruk.qr) kalimat += "<br>Scan QR di struk untuk membayar 📱";
  $("tMsg").innerHTML = kalimat;

  tampilkanStruk();
});

// ===== Jalankan saat halaman dibuka =====
pasangOpsiForm();