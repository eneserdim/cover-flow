(function(){
  const API_BASE = '/api';

  function getToken(){ return localStorage.getItem('nordic_token') || ''; }
  function setAuth(user, token){
    if (user) localStorage.setItem('nordic_current_user', JSON.stringify(user));
    else localStorage.removeItem('nordic_current_user');
    if (token) localStorage.setItem('nordic_token', token);
  }

  async function apiFetch(path, opts = {}){
    try {
      const res = await fetch(API_BASE + path, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          ...(opts.headers || {}),
          ...(getToken() ? { 'Authorization': 'Bearer ' + getToken() } : {}),
        }
      });
      if (!res.ok) throw new Error('API error: ' + res.status);
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function getCurrentUser(){
    try{ const raw = localStorage.getItem('nordic_current_user'); return raw ? JSON.parse(raw) : null; }catch{ return null; }
  }
  function getUsers(){ try{ const raw = localStorage.getItem('nordic_users'); return raw ? JSON.parse(raw) : []; }catch{ return []; } }
  function saveUsers(list){ localStorage.setItem('nordic_users', JSON.stringify(list)); }

  function getProducts(){ try{ const raw = localStorage.getItem('nordic_products'); return raw ? JSON.parse(raw) : []; }catch{ return []; } }
  function saveProducts(list){ localStorage.setItem('nordic_products', JSON.stringify(list)); }

  function getSettings(){ try{ const raw = localStorage.getItem('nordic_settings'); return raw ? JSON.parse(raw) : {}; }catch{ return {}; } }
  function saveSettingsLocal(s){ localStorage.setItem('nordic_settings', JSON.stringify(s)); }

  const guardText = document.getElementById('adminGuardText');
  const goLogin = document.getElementById('goLogin');
  const panel = document.getElementById('panel');

  async function checkAccess(){
    // Try API
    const me = await apiFetch('/auth/me');
    if (me && me.user && me.user.role === 'admin'){
      panel.style.display = 'grid';
      if (guardText) guardText.textContent = 'Hoş geldiniz, admin.';
      if (goLogin) goLogin.style.display = 'none';
      initPanel(true);
      return;
    }
    // Fallback to local user
    const user = getCurrentUser();
    if (!user || user.role !== 'admin'){
      panel.style.display = 'none';
      if (guardText) guardText.textContent = 'Admin yetkisi bulunamadı. Lütfen admin hesabı ile giriş yapın.';
      if (goLogin) goLogin.style.display = 'inline-flex';
    } else {
      panel.style.display = 'grid';
      if (guardText) guardText.textContent = 'Hoş geldiniz, admin.';
      if (goLogin) goLogin.style.display = 'none';
      initPanel(false);
    }
  }

  goLogin?.addEventListener('click', () => {
    alert('Lütfen Anasayfa > Giriş ile admin hesabınızla giriş yapın.');
    window.location.href = 'index.html';
  });

  /* Settings */
  const siteTitleInput = document.getElementById('siteTitleInput');
  const heroTitleInput = document.getElementById('heroTitleInput');
  const heroDescInput = document.getElementById('heroDescInput');
  const paytrTestModeInput = document.getElementById('paytrTestMode');
  const paytrCallbackUrlInput = document.getElementById('paytrCallbackUrl');
  const saveSettingsBtn = document.getElementById('saveSettings');

  /* Products */
  const pId = document.getElementById('pId');
  const pName = document.getElementById('pName');
  const pImage = document.getElementById('pImage');
  const pPrice = document.getElementById('pPrice');
  const addProductBtn = document.getElementById('addProduct');
  const clearFormBtn = document.getElementById('clearForm');
  const productList = document.getElementById('productList');

  /* Users */
  const userList = document.getElementById('userList');
  const ordersList = document.getElementById('ordersList');
  const refreshOrdersBtn = document.getElementById('refreshOrders');

  async function initPanel(api){
    if (api){
      const s = await apiFetch('/settings');
      if (s){
        if (siteTitleInput) siteTitleInput.value = s.site_title || 'Nordic Nature';
        if (heroTitleInput) heroTitleInput.value = s.hero_title || 'Mountain Landscape';
        if (heroDescInput) heroDescInput.value = s.hero_desc || 'Majestic peaks covered in snow during golden hour';
        if (paytrTestModeInput) paytrTestModeInput.value = (s.paytr_test_mode ?? 1);
        if (paytrCallbackUrlInput) paytrCallbackUrlInput.value = s.paytr_callback_url || '';
      }
      await renderProductsApi();
      await renderOrders();
    } else {
      const s = getSettings();
      if (siteTitleInput) siteTitleInput.value = s.siteTitle || 'Nordic Nature';
      if (heroTitleInput) heroTitleInput.value = s.heroTitle || 'Mountain Landscape';
      if (heroDescInput) heroDescInput.value = s.heroDesc || 'Majestic peaks covered in snow during golden hour';
      renderProductsLocal();
      ordersList.innerHTML = '<div>API devre dışı. Siparişler sadece API ile listelenir.</div>';
    }
    renderUsers();
  }

  saveSettingsBtn?.addEventListener('click', async () => {
    const s = {
      site_title: (siteTitleInput.value || '').trim(),
      hero_title: (heroTitleInput.value || '').trim(),
      hero_desc: (heroDescInput.value || '').trim(),
      paytr_test_mode: Number(paytrTestModeInput?.value || 1),
      paytr_callback_url: (paytrCallbackUrlInput?.value || '').trim() || null
    };
    const ok = await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(s) });
    if (ok) {
      alert('Ayarlar kaydedildi (API).');
    } else {
      // Fallback
      saveSettingsLocal({ siteTitle: s.site_title, heroTitle: s.hero_title, heroDesc: s.hero_desc });
      alert('Ayarlar kaydedildi (LocalStorage).');
    }
  });

  async function renderProductsApi(){
    const data = await apiFetch('/products');
    const list = data?.products || [];
    // Mirror to LocalStorage so vitrin/mağaza görebilsin
    try { saveProducts(list); } catch {}
    productList.innerHTML = '';
    if (list.length === 0){
      const hint = document.createElement('div');
      hint.textContent = 'Henüz ürün yok.';
      productList.appendChild(hint);
      return;
    }
    list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <img src="${p.image}" alt="${p.name}"/>
        <div>
          <div>${p.name}</div>
          <small>${p.id}</small>
        </div>
        <div>₺${Number(p.price).toFixed(2)}</div>
        <div style="display:flex; gap:6px;">
          <button class="btn" data-id="${p.id}" data-action="edit">Düzenle</button>
          <button class="btn" data-id="${p.id}" data-action="delete">Sil</button>
        </div>
      `;
      productList.appendChild(row);
    });
  }

  function renderProductsLocal(){
    const list = getProducts();
    productList.innerHTML = '';
    if (list.length === 0){
      const hint = document.createElement('div');
      hint.textContent = 'Henüz ürün eklenmedi. Ekle/Güncelle ile ürün oluşturabilirsiniz.';
      productList.appendChild(hint);
      return;
    }
    list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <img src="${p.image}" alt="${p.name}"/>
        <div>
          <div>${p.name}</div>
          <small>${p.id}</small>
        </div>
        <div>₺${Number(p.price).toFixed(2)}</div>
        <div style="display:flex; gap:6px;">
          <button class="btn" data-id="${p.id}" data-action="edit">Düzenle</button>
          <button class="btn" data-id="${p.id}" data-action="delete">Sil</button>
        </div>
      `;
      productList.appendChild(row);
    });
  }

  productList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');

    const api = await apiFetch('/auth/me');
    if (api){ // API path
      if (action === 'edit'){
        const list = (await apiFetch('/products'))?.products || [];
        const p = list.find(x => x.id === id);
        if (!p) return;
        pId.value = p.id; pName.value = p.name; pImage.value = p.image; pPrice.value = p.price;
      } else if (action === 'delete'){
        const ok = await apiFetch(`/products/${id}`, { method: 'DELETE' });
        if (!ok) return alert('Silme başarısız.');
        await renderProductsApi();
        alert('Ürün silindi.');
      }
      return;
    }

    // Fallback local
    const list = getProducts();
    if (action === 'edit'){
      const p = list.find(x => x.id === id);
      if (!p) return;
      pId.value = p.id; pName.value = p.name; pImage.value = p.image; pPrice.value = p.price;
    } else if (action === 'delete'){
      const next = list.filter(x => x.id !== id);
      saveProducts(next);
      renderProductsLocal();
      alert('Ürün silindi.');
    }
  });

  addProductBtn?.addEventListener('click', async () => {
    const id = (pId.value || '').trim();
    const name = (pName.value || '').trim();
    const image = (pImage.value || '').trim();
    const price = Number(pPrice.value || 0);
    if (!id || !name || !image || !price){
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    const api = await apiFetch('/auth/me');
    if (api){
      const ok = await apiFetch('/products', { method: 'POST', body: JSON.stringify({ id, name, image, price }) });
      if (!ok) return alert('Kayıt başarısız.');
      await renderProductsApi();
      alert('Ürün kaydedildi.');
      return;
    }
    const list = getProducts();
    const idx = list.findIndex(x => x.id === id);
    const entry = { id, name, image, price };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    saveProducts(list);
    renderProductsLocal();
    alert('Ürün kaydedildi.');
  });

  clearFormBtn?.addEventListener('click', () => {
    pId.value = ''; pName.value=''; pImage.value=''; pPrice.value='';
  });

  async function renderUsers(){
    // Öncelik API
    const data = await apiFetch('/users');
    const users = data?.users || [];
    userList.innerHTML = '';
    if (users.length === 0){
      const hint = document.createElement('div');
      hint.textContent = 'Henüz kullanıcı yok.';
      userList.appendChild(hint);
      return;
    }
    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'user-row';
      row.innerHTML = `
        <div>${u.name || '(isim yok)'}<br><small>${u.email}</small></div>
        <div>${u.role || 'user'}</div>
        <div style="display:flex; gap:6px;">
          <button class="btn" data-id="${u.id}" data-action="make-admin">Admin Yap</button>
          <button class="btn" data-id="${u.id}" data-action="delete">Sil</button>
        </div>
      `;
      userList.appendChild(row);
    });
  }

  userList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');

    // API üzerinden yönetim
    if (action === 'make-admin'){
      const ok = await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ role: 'admin' }) });
      if (!ok) return alert('Güncelleme başarısız.');
      await renderUsers();
      alert('Kullanıcı admin yapıldı.');
    } else if (action === 'delete'){
      const ok = await apiFetch(`/users/${id}`, { method: 'DELETE' });
      if (!ok) return alert('Silme başarısız.');
      await renderUsers();
      alert('Kullanıcı silindi.');
    }
  });

  async function renderOrders(){
    const data = await apiFetch('/orders');
    ordersList.innerHTML = '';
    const orders = data?.orders || [];
    if (orders.length === 0){
      const hint = document.createElement('div');
      hint.textContent = 'Henüz sipariş yok.';
      ordersList.appendChild(hint);
      return;
    }
    orders.forEach(o => {
      const row = document.createElement('div');
      row.className = 'order-row';
      const total = Number(o.total).toFixed(2);
      const created = new Date(o.created_at).toLocaleString('tr-TR');
      const refundDisabled = o.status !== 'paid' ? 'disabled' : '';
      row.innerHTML = `
        <div>#${o.id}<br><small>${created}</small></div>
        <div>${o.name}<br><small>${o.email}</small></div>
        <div>Toplam: ₺${total}</div>
        <div>
          <select class="status-select" data-id="${o.id}">
            ${['new','paid','shipped','cancelled','refunded'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn" data-id="${o.id}" data-action="details">Detay</button>
          <button class="btn" data-id="${o.id}" data-action="refund" ${refundDisabled}>İade Et</button>
        </div>
      `;
      ordersList.appendChild(row);
    });
  });
  }

  refreshOrdersBtn?.addEventListener('click', renderOrders);

  ordersList?.addEventListener('change', async (e) => {
    const sel = e.target.closest('select.status-select');
    if (!sel) return;
    const id = sel.getAttribute('data-id');
    const status = sel.value;
    const ok = await apiFetch(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (!ok) {
      alert('Durum güncellenemedi.');
    }
  });

  ordersList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');

    if (action === 'details'){
      const data = await apiFetch(`/orders/${id}`);
    if (!data || !data.order) return alert('Sipariş bulunamadı.');
    const m = document.getElementById('orderModal');
    const body = document.getElementById('orderModalBody');
    const o = data.order;
    const items = data.items || [];
    const refunds = data.refunds || [];
    const created = new Date(o.created_at).toLocaleString('tr-TR');
    const refundDisabled = o.status !== 'paid';
    body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>#${o.id}</strong> • ${created} • Durum: ${o.status}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="refundAmount" type="number" step="0.01" min="0.01" placeholder="İade Tutarı (₺)" style="width:160px;" ${refundDisabled ? 'disabled':''} value="${Number(o.total).toFixed(2)}" />
            <button class="btn" id="refundBtn" ${refundDisabled ? 'disabled':''} data-id="${o.id}">İade Et</button>
          </div>
        </div>
        <div style="margin-top:8px;">
          <div>${o.name} — ${o.email}</div>
          <div>${o.address}, ${o.city} ${o.postal_code}</div>
        </div>
        <div class="order-items">
          ${items.map(it => `
            <div class="order-item-row">
              <img src="${it.image}" alt="${it.name}" />
              <div>${it.name}<br><small>${it.product_id}</small></div>
              <div>₺${Number(it.price).toFixed(2)}</div>
              <div>× ${it.qty}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:10px;display:flex;gap:10px;justify-content:flex-end;">
          <div>Ara Toplam: ₺${Number(o.subtotal).toFixed(2)}</div>
          <div>Kargo: ₺${Number(o.shipping).toFixed(2)}</div>
          <div><strong>Toplam: ₺${Number(o.total).toFixed(2)}</strong></div>
        </div>
        <div style="margin-top:14px;">
          <h4>İade Geçmişi</h4>
          ${
            refunds.length
              ? refunds.map(r => `<div>- ₺${Number(r.amount).toFixed(2)} • ${new Date(r.created_at).toLocaleString('tr-TR')} ${r.reference_no ? `(Ref: ${r.reference_no})` : ''}</div>`).join('')
              : '<div>İade kaydı yok.</div>'
          }
        </div>
      `;
      m.classList.add('visible');
      m.setAttribute('aria-hidden','false');

      document.getElementById('refundBtn')?.addEventListener('click', async () => {
        const amt = Number(document.getElementById('refundAmount')?.value || 0);
        const ok = await apiFetch(`/orders/${id}/refund`, { method: 'POST', body: JSON.stringify({ amount: amt }) });
        if (!ok) return alert('İade başarısız.');
        alert('İade işlemi başarıyla gönderildi.');
        await renderOrders();
        m.classList.remove('visible');
        m.setAttribute('aria-hidden','true');
      });
    }
    else if (action === 'refund'){
      const def = Number(btn.closest('.order-row')?.querySelector('select.status-select') ? '0' : '0');
      const input = prompt('İade tutarı (₺)', '');
      const amt = Number(input || 0);
      const ok = await apiFetch(`/orders/${id}/refund`, { method: 'POST', body: JSON.stringify({ amount: amt }) });
      if (!ok) return alert('İade başarısız.');
      alert('İade işlemi başarıyla gönderildi.');
      await renderOrders();
    }
  });

  document.getElementById('orderModalClose')?.addEventListener('click', () => {
    const m = document.getElementById('orderModal');
    m.classList.remove('visible');
    m.setAttribute('aria-hidden','true');
  });

  document.getElementById('orderModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'orderModal'){
      const m = document.getElementById('orderModal');
      m.classList.remove('visible');
      m.setAttribute('aria-hidden','true');
    }
  });

  checkAccess();
})();