
    // =========================================================================
    // URL DEPLOYMENT WEB APP APPS SCRIPT PENILAIAN JURI GTK KAPUAS 2026
    // =========================================================================
    const GAS_JURI_API_URL = window.JURI_WEB_CONFIG.apiUrl;

    const INDIKATOR_RUBRIK = {
      PRESTASI: {
        t1_title: "1. Penilaian Naskah Best Practice (Bobot 30%)",
        t1_items: [
          "Orisinalitas, Kebaruan, dan Inovasi Gagasan (Maks 25)",
          "Sistematika Penulisan, Kejelasan Masalah & Solusi (Maks 25)",
          "Dampak Nyata & Keberlanjutan Praktik Baik (Maks 25)",
          "Kelengkapan Data, Bukti Pendukung & Referensi (Maks 25)"
        ],
        uk_items: [
          "Penguasaan Materi & Kedalaman Pemahaman Karya (Maks 25)",
          "Kualitas Penyajian, Media & Kejelasan Komunikasi (Maks 25)",
          "Kemampuan Argumentasi & Ketepatan Menjawab Tanya Jawab (Maks 25)",
          "Inspirasi & Potensi Replikasi bagi GTK Lain (Maks 25)"
        ],
        wk_title: "3. Penilaian Wawasan Kependidikan / Tes Lisan (Bobot 30%)",
        wk_items: [
          "Pemahaman Kebijakan Pendidikan Nasional & Kurikulum (Maks 25)",
          "Wawasan Kepemimpinan Pembelajaran & Transformasi Sekolah (Maks 25)",
          "Etika Profesi, Karakter, & Kode Etik Guru/PGRI (Maks 25)",
          "Kemampuan Analisis Masalah & Solusi Pendidikan Daerah (Maks 25)"
        ]
      },
      DEDIKATIF: {
        t1_title: "1. Penilaian Video Praktik Baik / Karya Dedikatif (Bobot 60%)",
        t1_items: [
          "Keaslian Situasi, Tantangan Lapangan & Pengabdian Nyata (Maks 25)",
          "Kreativitas & Strategi Pemecahan Masalah Pembelajaran (Maks 25)",
          "Dampak Positif bagi Murid, Sekolah & Masyarakat (Maks 25)",
          "Kualitas Alur Cerita, Visual, Audio & Kejelasan Pesan Video (Maks 25)"
        ],
        wk_title: "2. Penilaian Wawasan Kependidikan / Tes Lisan (Bobot 40%)",
        wk_items: [
          "Komitmen Pengabdian, Ketangguhan & Integritas Profesi (Maks 25)",
          "Pemahaman Kebijakan Pendidikan & Layanan Inklusif (Maks 25)",
          "Kolaborasi dengan Komunitas, Orang Tua & Pemangku Kepentingan (Maks 25)",
          "Refleksi Diri & Rencana Pengembangan Berkelanjutan (Maks 25)"
        ]
      }
    };

    let STATE = {
      token: sessionStorage.getItem('gtk_juri_token') || '',
      data: null,
      activePeserta: null
    };

    async function callJuriApi(action, payload = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      try {
        const res = await fetch(GAS_JURI_API_URL, {
          method: 'POST', credentials: 'omit', redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          signal: controller.signal,
          body: JSON.stringify({ action, token: STATE.token, payload })
        });
        if (!res.ok) throw new Error('Layanan gagal merespons (HTTP ' + res.status + ').');
        let data;
        try { data = await res.json(); }
        catch (_) { throw new Error('Respons bukan JSON. Periksa URL dan akses deployment juri.'); }
        if (!data || typeof data.success !== 'boolean') throw new Error('Format respons layanan juri tidak sesuai.');
        return data;
      } catch (err) {
        if (err.name === 'AbortError') throw new Error('Waktu tunggu habis. Jika sedang menyimpan nilai, muat ulang data sebelum mengirim ulang.');
        if (err instanceof TypeError) throw new Error('Tidak dapat menghubungi layanan juri. Periksa internet dan akses deployment.');
        throw err;
      } finally { clearTimeout(timer); }
    }

    async function checkConnection() {
      const el = document.getElementById('connection-status');
      el.textContent = 'Memeriksa koneksi...';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(GAS_JURI_API_URL, {credentials: 'omit', signal: controller.signal});
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (!data.success || data.service !== 'API Penilaian Juri GTK Kapuas 2026') throw new Error('Alamat backend bukan layanan juri.');
        el.textContent = 'Terhubung ke layanan penilaian juri';
      } catch (_) { el.textContent = 'Koneksi belum berhasil. Periksa internet atau deployment juri.'; }
      finally { clearTimeout(timer); }
    }

    window.addEventListener('DOMContentLoaded', () => {
      checkConnection();
      if (STATE.token) {
        loadDashboard();
      } else {
        showView('login');
      }
    });

    function showToast(msg, type = 'info') {
      const container = document.getElementById('toast-container');
      const colors = {
        success: 'bg-emerald-600 text-white border-emerald-500',
        error: 'bg-rose-600 text-white border-rose-500',
        info: 'bg-slate-900 text-white border-slate-700'
      };
      const el = document.createElement('div');
      el.className = `pointer-events-auto px-4 py-3.5 rounded-2xl shadow-xl border text-xs font-semibold transition-all fade-in ${colors[type] || colors.info}`;
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(() => {
        el.classList.add('opacity-0');
        setTimeout(() => el.remove(), 300);
      }, 4200);
    }

    function setLoading(show, text = 'Memproses data...') {
      document.getElementById('loader-text').textContent = text;
      document.getElementById('global-loader').classList.toggle('hidden', !show);
    }

    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
    }

    function showView(v) {
      ['login', 'juri', 'admin'].forEach(id => {
        document.getElementById('view-' + id).classList.add('hidden');
      });
      document.getElementById('view-' + v).classList.remove('hidden');

      const nav = document.getElementById('app-navbar');
      if (v === 'login') {
        nav.classList.add('hidden');
      } else {
        nav.classList.remove('hidden');
        const u = STATE.data?.user;
        if (u) {
          document.getElementById('nav-user-name').textContent = u.nama;
          document.getElementById('nav-user-rumpun').textContent = `${u.posisi_juri} • ${u.rumpun_tugas}`;
          document.getElementById('nav-posisi-badge').textContent = u.posisi_juri.toUpperCase();
        }
      }
    }

    // ==================== AUTH ====================
    async function handleLogin(e) {
      e.preventDefault();
      const u = document.getElementById('login-username').value;
      const p = document.getElementById('login-password').value;
      setLoading(true, 'Memverifikasi akun...');
      try {
        const res = await callJuriApi('loginUser', { username: u, password: p });
        setLoading(false);
        if (!res.success) return showToast(res.message, 'error');

        STATE.token = res.token;
        sessionStorage.setItem('gtk_juri_token', res.token);
        showToast('Selamat datang, ' + res.user.nama, 'success');
        loadDashboard();
      } catch (err) {
        setLoading(false);
        showToast(err.message, 'error');
      }
    }

    function handleLogout() {
      callJuriApi('logoutUser').catch(() => {});
      sessionStorage.removeItem('gtk_juri_token');
      STATE = { token: '', data: null, activePeserta: null };
      showView('login');
    }

    async function loadDashboard() {
      setLoading(true, 'Memuat data penilaian...');
      try {
        const res = await callJuriApi('getDashboardData');
        setLoading(false);
        if (!res.success) {
          showToast(res.message, 'error');
          handleLogout();
          return;
        }
        STATE.data = res;
        if (res.user.peran === 'Juri') {
          renderJuriDashboard();
          showView('juri');
        } else {
          renderAdminDashboard();
          showView('admin');
        }
      } catch (err) {
        setLoading(false);
        showToast(err.message, 'error');
      }
    }

    // ==================== DASHBOARD JURI ====================
    function renderJuriDashboard() {
      const { controls, scopes } = STATE.data;

      const t1Open = controls.TAHAP_1_NASKAH_VIDEO === 'BUKA';
      const t2Open = controls.TAHAP_2_UNJUK_WAWASAN === 'BUKA';
      const locked = controls.KUNCI_PLENO === 'YA';

      const b1 = document.getElementById('badge-tahap-1');
      b1.textContent = 'Tahap 1 (Naskah/Video): ' + controls.TAHAP_1_NASKAH_VIDEO;
      b1.className = t1Open ? 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200' : 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200';

      const b2 = document.getElementById('badge-tahap-2');
      b2.textContent = 'Tahap 2 (Unjuk Karya & Wawasan): ' + controls.TAHAP_2_UNJUK_WAWASAN;
      b2.className = t2Open ? 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200' : 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200';

      const bp = document.getElementById('badge-pleno');
      bp.textContent = locked ? 'STATUS: TERKUNCI (SIDANG PLENO)' : 'Status Pleno: Terbuka untuk Edit';
      bp.className = locked ? 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300' : 'px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200';

      const selScope = document.getElementById('juri-scope-select');
      const prevVal = selScope.value;
      selScope.innerHTML = scopes.map(s => `<option value="${s.sheet}">${s.label}</option>`).join('');
      if (prevVal && scopes.some(s => s.sheet === prevVal)) {
        selScope.value = prevVal;
      }

      renderJuriPesertaList();
    }

    function renderJuriPesertaList() {
      const { peserta, myScores, controls } = STATE.data;
      const activeSheet = document.getElementById('juri-scope-select').value;
      const q = document.getElementById('juri-search-input').value.toLowerCase().trim();
      const filterDone = document.getElementById('juri-filter-done').value;
      const locked = controls.KUNCI_PLENO === 'YA';

      const filtered = peserta.filter(p => {
        if (p.target_sheet !== activeSheet) return false;
        const matchSearch = !q || p.id_peserta.toLowerCase().includes(q) || p.no_kta.toLowerCase().includes(q) || p.nama.toLowerCase().includes(q);
        if (!matchSearch) return false;
        const hasScore = !!myScores[p.id_peserta];
        if (filterDone === 'SUDAH' && !hasScore) return false;
        if (filterDone === 'BELUM' && hasScore) return false;
        return true;
      });

      const grid = document.getElementById('juri-peserta-grid');
      if (filtered.length === 0) {
        grid.innerHTML = `<div class="md:col-span-2 bg-white p-10 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">Tidak ada data peserta pada pilihan jenjang / pencarian ini.</div>`;
        return;
      }

      grid.innerHTML = filtered.map(p => {
        const sc = myScores[p.id_peserta];
        const isDedikatif = p.target_sheet === 'NILAI_GURU_DEDIKATIF';
        return `
          <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-blue-400 transition flex flex-col justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white text-[11px] font-extrabold">${p.id_peserta}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${sc ? 'Sudah Dinilai (' + sc.nilai_akhir + ')' : 'Belum Dinilai'}
                </span>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900">${p.nama}</h3>
                <p class="text-xs text-slate-500">KTA: ${p.no_kta} • ${p.asal_sekolah} (${p.utusan_cabang})</p>
                <p class="text-[11px] font-semibold text-blue-700 mt-0.5">${p.kategori} • ${p.jenjang}</p>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div class="text-[11px] text-slate-600">
                ${sc
                  ? (isDedikatif
                      ? `Video: <strong>${sc.skor_t1}</strong> | Wawasan: <strong>${sc.skor_wk}</strong>`
                      : `Naskah: <strong>${sc.skor_t1}</strong> | Karya: <strong>${sc.skor_uk}</strong> | Wawasan: <strong>${sc.skor_wk}</strong>`)
                  : 'Klik tombol di kanan untuk mulai menilai'}
              </div>
              <button onclick="openModalRubrik('${p.id_peserta}')"
                class="px-4 py-2 rounded-xl text-xs font-bold transition ${
                  locked
                    ? 'bg-slate-200 text-slate-700'
                    : (sc ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs')
                }">
                ${locked ? 'Lihat Nilai' : (sc ? 'Edit Nilai' : 'Input Nilai')}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function openModalRubrik(idPeserta) {
      const { peserta, myScores, controls } = STATE.data;
      const p = peserta.find(x => x.id_peserta === idPeserta);
      if (!p) return;
      STATE.activePeserta = p;

      const isDedikatif = p.target_sheet === 'NILAI_GURU_DEDIKATIF';
      const sc = myScores[p.id_peserta] || {
        t1_ind: [0, 0, 0, 0],
        uk_ind: [0, 0, 0, 0],
        wk_ind: [0, 0, 0, 0],
        catatan: ''
      };

      const t1Open = controls.TAHAP_1_NASKAH_VIDEO === 'BUKA';
      const t2Open = controls.TAHAP_2_UNJUK_WAWASAN === 'BUKA';
      const locked = controls.KUNCI_PLENO === 'YA';

      document.getElementById('mdl-inp-id-peserta').value = p.id_peserta;
      document.getElementById('mdl-id-peserta').textContent = p.id_peserta;
      document.getElementById('mdl-nama-peserta').textContent = p.nama;
      document.getElementById('mdl-sub-peserta').textContent = `${p.kategori} • ${p.jenjang} • ${p.asal_sekolah} (KTA: ${p.no_kta})`;
      document.getElementById('mdl-catatan').value = sc.catatan || '';
      document.getElementById('mdl-catatan').disabled = locked;

      const cfg = isDedikatif ? INDIKATOR_RUBRIK.DEDIKATIF : INDIKATOR_RUBRIK.PRESTASI;
      document.getElementById('t1-heading').textContent = cfg.t1_title;
      document.getElementById('wk-heading').textContent = cfg.wk_title;
      document.getElementById('sec-unjuk-karya').classList.toggle('hidden', isDedikatif);

      const renderInputs = (containerId, labels, values, prefix, isDisabled) => {
        document.getElementById(containerId).innerHTML = labels.map((lbl, idx) => `
          <div class="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label class="block text-[11px] font-bold text-slate-700 leading-snug">${idx + 1}. ${lbl}</label>
            <input type="number" step="0.5" min="0" max="25" required
              id="${prefix}-${idx}" value="${values[idx] || 0}"
              ${isDisabled ? 'disabled' : ''}
              oninput="recalcLiveScore()"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 font-extrabold text-sm text-blue-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none disabled:opacity-60" />
          </div>
        `).join('');
      };

      renderInputs('t1-indicators-grid', cfg.t1_items, sc.t1_ind, 'inp-t1', locked || !t1Open);
      if (!isDedikatif) {
        renderInputs('uk-indicators-grid', cfg.uk_items, sc.uk_ind, 'inp-uk', locked || !t2Open);
      }
      renderInputs('wk-indicators-grid', cfg.wk_items, sc.wk_ind, 'inp-wk', locked || !t2Open);

      document.getElementById('btn-simpan-nilai').classList.toggle('hidden', locked || (!t1Open && !t2Open));

      recalcLiveScore();
      document.getElementById('modal-rubrik').classList.remove('hidden');
    }

    function recalcLiveScore() {
      if (!STATE.activePeserta) return;
      const isDedikatif = STATE.activePeserta.target_sheet === 'NILAI_GURU_DEDIKATIF';

      const readGroup = (prefix) => {
        let sum = 0;
        for (let i = 0; i < 4; i++) {
          const el = document.getElementById(`${prefix}-${i}`);
          if (el) sum += Math.min(25, Math.max(0, Number(el.value || 0)));
        }
        return Number(sum.toFixed(2));
      };

      const sT1 = readGroup('inp-t1');
      const sUK = isDedikatif ? 0 : readGroup('inp-uk');
      const sWK = readGroup('inp-wk');

      document.getElementById('live-skor-t1').textContent = sT1;
      if (!isDedikatif) document.getElementById('live-skor-uk').textContent = sUK;
      document.getElementById('live-skor-wk').textContent = sWK;

      const total = isDedikatif
        ? ((sT1 * 0.60) + (sWK * 0.40)).toFixed(2)
        : ((sT1 * 0.30) + (sUK * 0.40) + (sWK * 0.30)).toFixed(2);

      document.getElementById('live-nilai-akhir').textContent = total;
    }

    async function handleSaveRubrikScore(e) {
      e.preventDefault();
      if (!STATE.activePeserta) return;
      const isDedikatif = STATE.activePeserta.target_sheet === 'NILAI_GURU_DEDIKATIF';

      const collect = (prefix) => [0, 1, 2, 3].map(i => Number(document.getElementById(`${prefix}-${i}`).value || 0));

      const payload = {
        id_peserta: document.getElementById('mdl-inp-id-peserta').value,
        t1_ind: collect('inp-t1'),
        uk_ind: isDedikatif ? [0, 0, 0, 0] : collect('inp-uk'),
        wk_ind: collect('inp-wk'),
        catatan: document.getElementById('mdl-catatan').value
      };

      setLoading(true, 'Menyimpan nilai ke database...');
      try {
        const res = await callJuriApi('saveJuriScore', payload);
        setLoading(false);
        if (!res.success) return showToast(res.message, 'error');
        closeModal('modal-rubrik');
        showToast(res.message, 'success');
        loadDashboard();
      } catch (err) {
        setLoading(false);
        showToast(err.message, 'error');
      }
    }

    // ==================== DASHBOARD ADMIN ====================
    function renderAdminDashboard() {
      const { controls } = STATE.data;
      document.getElementById('ctrl-tahap-1').value = controls.TAHAP_1_NASKAH_VIDEO || 'BUKA';
      document.getElementById('ctrl-tahap-2').value = controls.TAHAP_2_UNJUK_WAWASAN || 'BUKA';
      document.getElementById('ctrl-kunci-pleno').value = controls.KUNCI_PLENO || 'TIDAK';
      renderAdminRekapTable();
    }

    function renderAdminRekapTable() {
      const shFilter = document.getElementById('adm-filter-sheet').value;
      const q = document.getElementById('adm-search-peserta').value.toLowerCase().trim();

      const list = STATE.data.rekap.filter(r => {
        if (shFilter && r.sheet_sumber !== shFilter) return false;
        if (q && !String(r.id_peserta).toLowerCase().includes(q) && !String(r.nama).toLowerCase().includes(q) && !String(r.no_kta).toLowerCase().includes(q)) return false;
        return true;
      });

      document.getElementById('adm-rekap-tbody').innerHTML = list.map(r => `
        <tr class="hover:bg-slate-50">
          <td class="p-3">
            <div class="font-extrabold text-slate-900"><span class="text-blue-600">${r.id_peserta}</span> — ${r.nama}</div>
            <div class="text-[11px] text-slate-500">KTA: ${r.no_kta} | ${r.asal_sekolah} (${r.utusan_cabang})</div>
          </td>
          <td class="p-3">
            <div class="font-bold text-slate-800">${r.kategori}</div>
            <div class="text-[11px] text-slate-500">${r.jenjang}</div>
          </td>
          <td class="p-3 text-center font-bold">${r.j1_total}</td>
          <td class="p-3 text-center font-bold">${r.j2_total}</td>
          <td class="p-3 text-center">${r.rata_t1}</td>
          <td class="p-3 text-center">${r.rata_uk}</td>
          <td class="p-3 text-center">${r.rata_wk}</td>
          <td class="p-3 text-center font-extrabold text-blue-700 bg-blue-50/50 text-sm">${r.nilai_akhir}</td>
          <td class="p-3 text-center">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
              r.status.includes('Lengkap') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }">${r.status}</span>
          </td>
        </tr>
      `).join('');
    }

    async function handleSaveStageControls(e) {
      e.preventDefault();
      const payload = {
        TAHAP_1_NASKAH_VIDEO: document.getElementById('ctrl-tahap-1').value,
        TAHAP_2_UNJUK_WAWASAN: document.getElementById('ctrl-tahap-2').value,
        KUNCI_PLENO: document.getElementById('ctrl-kunci-pleno').value
      };
      setLoading(true, 'Menyimpan pengaturan...');
      try {
        const res = await callJuriApi('adminUpdateStageControls', payload);
        setLoading(false);
        if (!res.success) return showToast(res.message, 'error');
        showToast(res.message, 'success');
        loadDashboard();
      } catch (err) {
        setLoading(false);
        showToast(err.message, 'error');
      }
    }

    async function adminRefreshRekap() {
      setLoading(true, 'Menyinkronkan seluruh sheet nilai...');
      try {
        const res = await callJuriApi('adminRefreshAllRekap');
        setLoading(false);
        if (!res.success) return showToast(res.message, 'error');
        showToast(res.message, 'success');
        loadDashboard();
      } catch (err) {
        setLoading(false);
        showToast(err.message, 'error');
      }
    }

    function exportRekapJuriCSV() {
      if (!STATE.data || !STATE.data.rekap) return;
      const headers = [
        'ID_Peserta', 'No_KTA_PGRI', 'Nama', 'Asal_Sekolah', 'Utusan_Cabang', 'Kategori', 'Jenjang', 'Sheet_Sumber',
        'J1_Tahap1', 'J1_UnjukKarya', 'J1_Wawasan', 'J1_Total',
        'J2_Tahap1', 'J2_UnjukKarya', 'J2_Wawasan', 'J2_Total',
        'Rata_Tahap1', 'Rata_UnjukKarya', 'Rata_Wawasan', 'Nilai_Akhir_Gabungan', 'Status_Penilaian'
      ];
      const csvLines = [headers.join(',')];
      STATE.data.rekap.forEach(r => {
        const vals = [
          r.id_peserta, r.no_kta, r.nama, r.asal_sekolah, r.utusan_cabang, r.kategori, r.jenjang, r.sheet_sumber,
          r.j1_t1, r.j1_uk, r.j1_wk, r.j1_total,
          r.j2_t1, r.j2_uk, r.j2_wk, r.j2_total,
          r.rata_t1, r.rata_uk, r.rata_wk, r.nilai_akhir, r.status
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`);
        csvLines.push(vals.join(','));
      });
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Penilaian_Juri_GTK_Kapuas_2026_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }

