
    // =========================================================================
    // URL DEPLOYMENT WEB APP APPS SCRIPT PENILAIAN JURI GTK KAPUAS 2026
    // =========================================================================
    const GAS_JURI_API_URL = window.JURI_WEB_CONFIG.apiUrl;

    const komponenNama = {karya:'Karya Tulis',video:'Video',gelar:'Gelar Wicara',wawasan:'Wawasan Kependidikan'};
    let lihatRekap = false;
    function kelompok(p) { return p.target_sheet === 'NILAI_GURU_DEDIKATIF' ? ['video','wawasan'] : ['karya','gelar','wawasan']; }
    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    }
    function bahan(p) {
      if (!p.bahan || !/^https?:\/\//i.test(p.bahan.url)) return 'Belum tersedia';
      return '<a class="text-blue-700 underline" target="_blank" rel="noopener noreferrer" href="'+esc(p.bahan.url)+'">'+esc(p.bahan.judul || 'Buka karya')+' ↗</a>';
    }
    function hasil(key, values) {
      if (!values || values.some(v=>v===null)) return null;
      return Number((values.reduce((n,v,i)=>n+v*STATE.data.rubrik[key][i][1],0)/100).toFixed(2));
    }
    function menuJuri(rekap) { lihatRekap=rekap; renderJuriPesertaList(); }
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
        const record = myScores[p.id_peserta];
        const hasScore = kelompok(p).every(k => hasil(k,record?.indikator[k]) !== null);
        if (filterDone==='DRAF' && (!record || hasScore)) return false;
        if (filterDone === 'SUDAH' && !hasScore) return false;
        if (filterDone === 'BELUM' && record) return false;
        return true;
      });

      const grid = document.getElementById('juri-peserta-grid');
      for (const [id,active] of [['tab-penilaian',!lihatRekap],['tab-rekap',lihatRekap]]) {
        const btn=document.getElementById(id);
        btn.className='px-4 py-2 rounded-lg font-bold '+(active?'bg-blue-700 text-white':'bg-white text-blue-700');
        btn.setAttribute('aria-pressed',String(active));
      }
      const keys=kelompok({target_sheet:activeSheet});
      const headers=['Peserta','Sekolah',...(lihatRekap ? keys.map(k=>komponenNama[k]) : ['Naskah / Video','Progres','Penilaian'])];
      const rows=filtered.map((p,i)=>{
        const sc=myScores[p.id_peserta]?.indikator || {};
        const scores=keys.map(k=>hasil(k,sc[k]));
        const cols=[esc(p.nama),esc(p.asal_sekolah),...(lihatRekap ? scores.map(v=>v ?? '—') :
          [bahan(p),scores.filter(v=>v!==null).length+' / '+keys.length+' komponen lengkap','<button class="text-blue-700 underline" data-row="'+i+'">Buka rubrik</button>'])];
        return '<tr>'+cols.map(v=>'<td class="p-3 border-t">'+v+'</td>').join('')+'</tr>';
      });
      grid.innerHTML='<table class="w-full text-left text-sm"><thead><tr>'+headers.map(x=>'<th class="p-3 bg-slate-50">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>'+(rows.length?'':'<p class="p-4">Tidak ada peserta sesuai filter.</p>');
      grid.querySelectorAll('[data-row]').forEach(btn=>btn.onclick=()=>openModalRubrik(filtered[Number(btn.dataset.row)]));
    }

    function openModalRubrik(p) {
      STATE.activePeserta=p;
      const sc=STATE.data.myScores[p.id_peserta] || {};
      STATE.diubah=new Set();
      STATE.draf=JSON.parse(JSON.stringify(sc.indikator || {}));
      document.getElementById('mdl-id-peserta').textContent=p.id_peserta;
      document.getElementById('mdl-nama-peserta').textContent=p.nama;
      document.getElementById('mdl-sub-peserta').textContent=[p.kategori,p.jenjang,p.asal_sekolah].join(' · ');
      document.getElementById('mdl-catatan').value=sc.catatan || '';
      document.getElementById('bahan-modal').innerHTML=bahan(p);
      document.getElementById('pilih-komponen').innerHTML=kelompok(p).map(k=>'<option value="'+k+'">'+komponenNama[k]+'</option>').join('');
      gantiKomponen();
      document.getElementById('modal-rubrik').classList.remove('hidden');
    }
    function terbuka(k) {
      const c=STATE.data.controls;
      return c.KUNCI_PLENO!=='YA' && c[['karya','video'].includes(k)?'TAHAP_1_NASKAH_VIDEO':'TAHAP_2_UNJUK_WAWASAN']==='BUKA';
    }
    function gantiKomponen() {
      const key=document.getElementById('pilih-komponen').value;
      const values=STATE.draf[key] || STATE.data.rubrik[key].map(()=>null);
      const grid=document.getElementById('indikator-juri');
      grid.innerHTML=STATE.data.rubrik[key].map(([label,persen],i)=>
        '<label class="block border rounded-lg p-3">'+esc(label)+' ('+persen+'%)<input class="block border rounded p-2 w-full mt-2" type="number" min="0" max="100" step="any" placeholder="0–100" value="'+(values[i]??'')+'" '+(terbuka(key)?'':'disabled')+'></label>').join('');
      const update=()=>{document.getElementById('skor-komponen').textContent=hasil(key,values) ?? '— (belum lengkap)';};
      grid.querySelectorAll('input').forEach((el,i)=>el.oninput=()=>{values[i]=el.value===''?null:el.valueAsNumber; STATE.draf[key]=values;STATE.diubah.add(key);update();});
      document.getElementById('mdl-catatan').disabled=!kelompok(STATE.activePeserta).some(terbuka);
      document.getElementById('btn-simpan-nilai').disabled=document.getElementById('mdl-catatan').disabled;
      update();
    }
    async function handleSaveRubrikScore(e) {
      e.preventDefault();
      const indikator=Object.fromEntries(Object.entries(STATE.draf).filter(([key])=>terbuka(key) && STATE.diubah.has(key)));
      if (!Object.keys(indikator).length && document.getElementById('mdl-catatan').value===(STATE.data.myScores[STATE.activePeserta.id_peserta]?.catatan || '')) return showToast('Belum ada perubahan nilai atau catatan.','info');
      const payload={id_peserta:STATE.activePeserta.id_peserta,indikator,catatan:document.getElementById('mdl-catatan').value};
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
      renderPleno();
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
        if (shFilter && r.target_sheet !== shFilter) return false;
        if (q && !String(r.id_peserta).toLowerCase().includes(q) && !String(r.nama).toLowerCase().includes(q) && !String(r.no_kta).toLowerCase().includes(q)) return false;
        return true;
      });

      document.getElementById('adm-rekap-tbody').innerHTML=list.flatMap(r=>Object.entries(r.nilai).map(([key,vals])=>'<tr>'+[r.nama,r.kategori+' · '+r.jenjang,komponenNama[key],...vals].map(v=>'<td class="p-3 border-t">'+esc(v??'—')+'</td>').join('')+'</tr>')).join('');
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
      setLoading(true, 'Mengambil tautan naskah dan video...');
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
      const headers=['ID Peserta','KTA','Nama','Kategori','Jenjang','Komponen','Juri 1','Juri 2','Rata-rata','Tes tertulis','Portofolio','Kepribadian','Nilai akhir pleno'];
      const csvLines=[headers.join(',')];
      for (const r of STATE.data.rekap) {
        for (const [key,vals] of Object.entries(r.nilai)) {
          csvLines.push([r.id_peserta,r.no_kta,r.nama,r.kategori,r.jenjang,komponenNama[key],...vals,...(STATE.data.pleno.tambahan[r.id_peserta]||[null,null,null]),r.akhir].map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(','));
        }
      }
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Penilaian_Juri_GTK_Kapuas_2026_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }


    const labelPleno=['Karya Tulis / Video','Gelar Wicara','Wawasan','Tes Tertulis','Portofolio','Kepribadian'];
    function panelAdmin(pleno) {
      document.getElementById('panel-pleno').classList.toggle('hidden',!pleno);
      document.getElementById('panel-komponen').classList.toggle('hidden',pleno);
    }
    function inputPleno(labels,values) {
      return labels.map((l,i)=>'<label class="text-xs">'+l+'<input class="block border rounded p-2 w-24" type="number" step="any" min="0" max="100" value="'+esc(values?.[i]??'')+'"></label>').join('');
    }
    function renderPleno() {
      const grup=document.getElementById('grup-pleno').value;
      const list=STATE.data.rekap.filter(r=>(r.nilai.video?'Dedikasi':/kepsek|kepala sekolah/i.test(r.kategori)?'Kepsek':'Guru')===grup);
      document.getElementById('bobot-input').innerHTML=inputPleno(labelPleno,STATE.data.pleno.bobot[grup]);
      const sel=document.getElementById('peserta-pleno'),previous=sel.value;
      sel.innerHTML=list.map(p=>'<option value="'+esc(p.id_peserta)+'">'+esc(p.nama)+' · '+esc(p.jenjang)+'</option>').join('');
      if(list.some(p=>p.id_peserta===previous)) sel.value=previous;
      nilaiTambahan();
      document.getElementById('hasil-pleno').innerHTML='<table class="w-full text-left"><thead><tr><th>Peserta</th><th>Jenjang</th><th>Nilai akhir</th></tr></thead><tbody>'+list.map(r=>'<tr><td>'+esc(r.nama)+'</td><td>'+esc(r.jenjang)+'</td><td>'+(r.akhir??'Belum lengkap')+'</td></tr>').join('')+'</tbody></table>';
    }
    function nilaiTambahan() {
      const id=document.getElementById('peserta-pleno').value;
      document.getElementById('tambahan-input').innerHTML=inputPleno(labelPleno.slice(3),STATE.data.pleno.tambahan[id]);
    }
    async function simpanPleno(bobot) {
      const id=document.getElementById(bobot?'grup-pleno':'peserta-pleno').value;
      const nilai=Array.from(document.querySelectorAll((bobot?'#bobot-input':'#tambahan-input')+' input'),el=>el.value===''?null:el.valueAsNumber);
      try {
        const res=await callJuriApi('adminSimpanPleno',{jenis:bobot?'bobot':'tambahan',id,nilai});
        if (!res.success) throw new Error(res.message);
        await loadDashboard();
        showToast(res.message,'success');
      } catch(e) {showToast(e.message,'error');}
    }
