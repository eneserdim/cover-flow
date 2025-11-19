(function(){
  function getCurrentUser(){
    try{ const raw = localStorage.getItem('nordic_current_user'); return raw ? JSON.parse(raw) : null; }catch{ return null; }
  }
  function getUsers(){
    try{ const raw = localStorage.getItem('nordic_users'); return raw ? JSON.parse(raw) : []; }catch{ return []; }
  }
  function saveUsers(list){ localStorage.setItem('nordic_users', JSON.stringify(list)); }

  function getProducts(){
    try{ const raw = localStorage.getItem('nordic_products'); return raw ? JSON.parse(raw) : []; }catch{ return []; }
  }
  function saveProducts(list){ localStorage.setItem('nordic_products', JSON.stringify(list)); }

  function getSettings(){
    try{ const raw = localStorage.getItem('nordic_settings'); return raw ? JSON.parse(raw) : {}; }catch{ return {}; }
  }
  function saveSettings(s){ localStorage.setItem('nordic_settings', JSON.stringify(s)); }

  const guardText = document.getElementById('adminGuardText');
  const goLogin = document.getElementById('goLogin');
  const panel = document.getElementById('panel');

  function checkAccess(){
    const user = getCurrentUser();
    if (!user || user.role !== 'admin'){
      panel.style.display = 'none';
      if (guardText) guardText.textContent = 'Admin yetkisi bulunamadı. Lütfen admin hesabı ile giriş yapın.';
      if (goLogin) goLogin.style.display = 'inline-flex';
    } else {
      panel.style.display = 'grid';
      if (guardText) guardText.textContent = 'Hoş geldiniz, admin.';
      if (goLogin) goLogin.style.display = 'none';
      initPanel();
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

  function initPanel(){
    // Load settings
    const s = getSettings();
    if (siteTitleInput) siteTitleInput.value = s.siteTitle || 'Nordic Nature';
    if (heroTitleInput) heroTitleInput.value = s.heroTitle || 'Mountain Landscape';
    if (heroDescInput) heroDescInput.value = s.heroDesc || 'Majestic peaks covered in snow during golden hour';

    renderProducts();
    renderUsers();
  }

  saveSettingsBtn?.addEventListener('click', () => {
    const s = {
      siteTitle: (siteTitleInput.value || '').trim(),
      heroTitle: (heroTitleInput.value || '').trim(),
      heroDesc: (heroDescInput.value || '').trim(),
    };
    saveSettings(s);
    alert('Ayarlar kaydedildi.');
  });

  function renderProducts(){
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

  productList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    const list = getProducts();
    if (action === 'edit'){
      const p = list.find(x => x.id === id);
      if (!p) return;
      pId.value = p.id; pName.value = p.name; pImage.value = p.image; pPrice.value = p.price;
    } else if (action === 'delete'){
      const next = list.filter(x => x.id !== id);
      saveProducts(next);
      renderProducts();
      alert('Ürün silindi.');
    }
  });

  addProductBtn?.addEventListener('click', () => {
    const id = (pId.value || '').trim();
    const name = (pName.value || '').trim();
    const image = (pImage.value || '').trim();
    const price = Number(pPrice.value || 0);
    if (!id || !name || !image || !price){
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    const list = getProducts();
    const idx = list.findIndex(x => x.id === id);
    const entry = { id, name, image, price };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    saveProducts(list);
    renderProducts();
    alert('Ürün kaydedildi.');
  });

  clearFormBtn?.addEventListener('click', () => {
    pId.value = ''; pName.value=''; pImage.value=''; pPrice.value='';
  });

  function renderUsers(){
    const users = getUsers();
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
          <button class="btn" data-email="${u.email}" data-action="make-admin">Admin Yap</button>
          <button class="btn" data-email="${u.email}" data-action="delete">Sil</button>
        </div>
      `;
      userList.appendChild(row);
    });
  }

  userList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const email = btn.getAttribute('data-email');
    const action = btn.getAttribute('data-action');
    const users = getUsers();
    const idx = users.findIndex(x => x.email === email);
    if (idx < 0) return;
    if (action === 'make-admin'){
      users[idx].role = 'admin';
      saveUsers(users);
      renderUsers();
      alert('Kullanıcı admin yapıldı.');
    } else if (action === 'delete'){
      users.splice(idx, 1);
      saveUsers(users);
      renderUsers();
      alert('Kullanıcı silindi.');
    }
  });

  checkAccess();
})();