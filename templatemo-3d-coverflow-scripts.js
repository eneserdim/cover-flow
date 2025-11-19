

TemplateMo 595 3d coverflow

https://templatemo.com/tm-595-3d-coverflow

*/

// JavaScript Document

        // Coverflow functionality
        const items = document.querySelectorAll('.coverflow-item');
        const dotsContainer = document.getElementById('dots');
        const currentTitle = document.getElementById('current-title');
        const currentDescription = document.getElementById('current-description');
        const container = document.querySelector('.coverflow-container');
        const menuToggle = document.getElementById('menuToggle');
        const mainMenu = document.getElementById('mainMenu');
        let currentIndex = 3;
        let isAnimating = false;

        // Mobile menu toggle
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mainMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on menu items (except external links)
        document.querySelectorAll('.menu-item:not(.external)').forEach(item => {
            item.addEventListener('click', (e) => {
                menuToggle.classList.remove('active');
                mainMenu.classList.remove('active');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !mainMenu.contains(e.target)) {
                menuToggle.classList.remove('active');
                mainMenu.classList.remove('active');
            }
        });

        // Image data with titles and descriptions
        const imageData = [
            {
                title: "Mountain Landscape",
                description: "Majestic peaks covered in snow during golden hour"
            },
            {
                title: "Forest Path",
                description: "A winding trail through ancient woodland"
            },
            {
                title: "Lake Reflection",
                description: "Serene waters mirroring the surrounding landscape"
            },
            {
                title: "Ocean Sunset",
                description: "Golden hour over endless ocean waves"
            },
            {
                title: "Desert Dunes",
                description: "Rolling sand dunes under vast blue skies"
            },
            {
                title: "Starry Night",
                description: "Countless stars illuminating the dark sky"
            },
            {
                title: "Waterfall",
                description: "Cascading water through lush green forest"
            }
        ];

        // Create dots
        items.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.onclick = () => goToIndex(index);
            dotsContainer.appendChild(dot);
        });

        const dots = document.querySelectorAll('.dot');
        let autoplayInterval = null;
        let isPlaying = true;
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');

        function updateCoverflow() {
            if (isAnimating) return;
            isAnimating = true;

            items.forEach((item, index) => {
                let offset = index - currentIndex;
                
                if (offset > items.length / 2) {
                    offset = offset - items.length;
                }
                else if (offset < -items.length / 2) {
                    offset = offset + items.length;
                }
                
                const absOffset = Math.abs(offset);
                const sign = Math.sign(offset);
                
                let translateX = offset * 220;
                let translateZ = -absOffset * 200;
                let rotateY = -sign * Math.min(absOffset * 60, 60);
                let opacity = 1 - (absOffset * 0.2);
                let scale = 1 - (absOffset * 0.1);

                if (absOffset > 3) {
                    opacity = 0;

                    translateX = sign * 800;
                }

                item.style.transform = `
                    translateX(${translateX}px) 
                    translateZ(${translateZ}px) 
                    rotateY(${rotateY}deg)
                    scale(${scale})
                `;
                item.style.opacity = opacity;
                item.style.zIndex = 100 - absOffset;

                item.classList.toggle('active', index === currentIndex);
            });

            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });

            const currentData = imageData[currentIndex];
            currentTitle.textContent = currentData.title;
            currentDescription.textContent = currentData.description;
            
            currentTitle.style.animation = 'none';
            currentDescription.style.animation = 'none';
            setTimeout(() => {
                currentTitle.style.animation = 'fadeIn 0.6s forwards';
                currentDescription.style.animation = 'fadeIn 0.6s forwards';
            }, 10);

            setTimeout(() => {
                isAnimating = false;
            }, 600);
        }

        function navigate(direction) {
            if (isAnimating) return;
            
            currentIndex = currentIndex + direction;
            
            if (currentIndex < 0) {
                currentIndex = items.length - 1;
            } else if (currentIndex >= items.length) {
                currentIndex = 0;
            }
            
            updateCoverflow();
        }

        function goToIndex(index) {
            if (isAnimating || index === currentIndex) return;
            currentIndex = index;
            updateCoverflow();
        }

        // Keyboard navigation
        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') navigate(-1);
            if (e.key === 'ArrowRight') navigate(1);
        });

        // Click on items to select
        items.forEach((item, index) => {
            item.addEventListener('click', () => goToIndex(index));
        });

        // Touch/swipe support
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;
        let isSwiping = false;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            isSwiping = true;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            
            const currentX = e.changedTouches[0].screenX;
            const diff = currentX - touchStartX;
            
            if (Math.abs(diff) > 10) {
                e.preventDefault();
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
            isSwiping = false;
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 30;
            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;
            
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
                handleUserInteraction();
                
                if (diffX > 0) {
                    navigate(1);
                } else {
                    navigate(-1);
                }
            }
        }

        // Initialize images and reflections
        items.forEach((item, index) => {
            const img = item.querySelector('img');
            const reflection = item.querySelector('.reflection');
            
            img.onload = function() {

                this.parentElement.classList.remove('image-loading');
                reflection.style.setProperty('--bg-image', `url(${this.src})`);
                reflection.style.backgroundImage = `url(${this.src})`;
                reflection.style.backgroundSize = 'cover';
                reflection.style.backgroundPosition = 'center';
            };
            
            img.onerror = function() {
                this.parentElement.classList.add('image-loading');
            };
        });

        // Autoplay functionality
        function startAutoplay() {
            autoplayInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % items.length;
                updateCoverflow();
            }, 4000);
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }

        function stopAutoplay() {
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            }
            isPlaying = false;
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }

        function toggleAutoplay() {
            if (isPlaying) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
        }

        function handleUserInteraction() {
            stopAutoplay();
        }

        // Add event listeners to stop autoplay on manual navigation
        items.forEach((item) => {
            item.addEventListener('click', handleUserInteraction);
        });

        document.querySelector('.nav-button.prev').addEventListener('click', handleUserInteraction);
        document.querySelector('.nav-button.next').addEventListener('click', handleUserInteraction);
        
        dots.forEach((dot) => {
            dot.addEventListener('click', handleUserInteraction);
        });

        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                handleUserInteraction();
            }
        });

        // Smooth scrolling and active menu item
        const sections = document.querySelectorAll('.section');
        const menuItems = document.querySelectorAll('.menu-item');
        const header = document.getElementById('header');
        const scrollToTopBtn = document.getElementById('scrollToTop');

        // Update active menu item on scroll
        function updateActiveMenuItem() {
            const scrollPosition = window.scrollY + 100;

            sections.forEach((section, index) => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    menuItems.forEach(item => {
                        if (!item.classList.contains('external')) {
                            item.classList.remove('active');
                        }
                    });
                    if (menuItems[index] && !menuItems[index].classList.contains('external')) {
                        menuItems[index].classList.add('active');
                    }
                }
            });

            // Header background on scroll
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Show/hide scroll to top button
            if (window.scrollY > 500) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', updateActiveMenuItem);

        // Smooth scroll to section
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const targetId = item.getAttribute('href');
                
                // Check if it's an internal link (starts with #)
                if (targetId && targetId.startsWith('#')) {
                    e.preventDefault();
                    const targetSection = document.querySelector(targetId);
                    
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                // External links will open normally in new tab
            });
        });

        // Logo click to scroll to top
        document.querySelector('.logo-container').addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Scroll to top button
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Form submission
        function handleSubmit(event) {
            event.preventDefault();
            alert('Teşekkürler! Mesajınızı aldık, en kısa sürede dönüş yapacağız.');
            event.target.reset();
        }

        /* ====== E‑Ticaret: Ürünler, Sepet ve Ödeme ====== */
        const products = [
            { id: 'mountain', name: 'Dağ Manzarası Baskı', image: 'images/mountain-landscape.jpg', price: 799.90 },
            { id: 'forest', name: 'Orman Yolu Baskı', image: 'images/forest-path.jpg', price: 699.90 },
            { id: 'lake', name: 'Göl Yansıması Baskı', image: 'images/serene-water-mirroring.jpg', price: 749.90 },
            { id: 'ocean', name: 'Okyanus Gün Batımı Baskı', image: 'images/ocean-sunset-golden-hour.jpg', price: 729.90 },
            { id: 'desert', name: 'Çöl Kum Tepeleri Baskı', image: 'images/rolling-sand-dunes.jpg', price: 699.90 },
            { id: 'night', name: 'Yıldızlı Gece Baskı', image: 'images/starry-night.jpg', price: 799.90 },
            { id: 'waterfall', name: 'Şelale Baskı', image: 'images/cascading-waterfall.jpg', price: 749.90 },
        ];

        const productGrid = document.getElementById('productGrid');
        const searchInput = document.getElementById('searchInput');
        const sortSelect = document.getElementById('sortSelect');
        const cartCountEl = document.getElementById('cartCount');
        const cartDrawer = document.getElementById('cartDrawer');
        const cartBackdrop = document.getElementById('cartBackdrop');
        const openCartBtn = document.getElementById('openCartBtn');
        const closeCartBtn = document.getElementById('closeCartBtn');
        const cartItemsEl = document.getElementById('cartItems');
        const subtotalText = document.getElementById('subtotalText');
        const shippingText = document.getElementById('shippingText');
        const totalText = document.getElementById('totalText');

        const summaryItemsEl = document.getElementById('summaryItems');
        const summarySubtotalEl = document.getElementById('summarySubtotal');
        const summaryShippingEl = document.getElementById('summaryShipping');
        const summaryTotalEl = document.getElementById('summaryTotal');
        const checkoutForm = document.getElementById('checkoutForm');

        let cart = [];
        const CURRENCY = '₺';

        function formatPrice(n) {
            return CURRENCY + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function loadCart() {
            try {
                const raw = localStorage.getItem('nordic_cart');
                cart = raw ? JSON.parse(raw) : [];
            } catch {
                cart = [];
            }
        }
        function saveCart() {
            localStorage.setItem('nordic_cart', JSON.stringify(cart));
        }

        function updateCartCount() {
            const count = cart.reduce((sum, it) => sum + it.qty, 0);
            cartCountEl.textContent = String(count);
        }

        function renderProducts(list) {
            if (!productGrid) return;
            productGrid.innerHTML = '';
            list.forEach(p => {
                const el = document.createElement('div');
                el.className = 'product-card';
                el.innerHTML = `
                    <div class="product-media"><img src="${p.image}" alt="${p.name}"></div>
                    <div class="product-body">
                        <div class="product-title">${p.name}</div>
                        <div class="product-meta">
                            <span class="price-text">${formatPrice(p.price)}</span>
                            <span>300gsm Mat</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn" data-id="${p.id}" data-action="details">Detay</button>
                            <button class="btn primary" data-id="${p.id}" data-action="add">Sepete Ekle</button>
                        </div>
                    </div>
                `;
                productGrid.appendChild(el);
            });
        }

        function getSortedFiltered() {
            const q = (searchInput?.value || '').toLowerCase().trim();
            let list = products.filter(p =>
                p.name.toLowerCase().includes(q)
            );
            const sort = sortSelect?.value;
            if (sort === 'priceAsc') list.sort((a, b) => a.price - b.price);
            else if (sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
            else if (sort === 'nameAsc') list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
            else if (sort === 'nameDesc') list.sort((a, b) => b.name.localeCompare(a.name, 'tr'));
            return list;
        }

        function addToCart(id, qty = 1) {
            const p = products.find(x => x.id === id);
            if (!p) return;
            const existing = cart.find(x => x.id === id);
            if (existing) existing.qty += qty;
            else cart.push({ id, qty: qty });
            saveCart();
            updateCartCount();
            renderCart();
        }

        function removeFromCart(id) {
            cart = cart.filter(x => x.id !== id);
            saveCart();
            updateCartCount();
            renderCart();
        }

        function setQty(id, qty) {
            const item = cart.find(x => x.id === id);
            if (!item) return;
            item.qty = Math.max(1, qty);
            saveCart();
            updateCartCount();
            renderCart();
        }

        function calcTotals() {
            const subtotal = cart.reduce((sum, it) => {
                const p = products.find(x => x.id === it.id);
                return sum + (p ? p.price * it.qty : 0);
            }, 0);
            const shipping = subtotal > 1000 ? 0 : (subtotal > 0 ? 49.90 : 0);
            const total = subtotal + shipping;
            return { subtotal, shipping, total };
        }

        function renderCart() {
            if (!cartItemsEl) return;
            cartItemsEl.innerHTML = '';
            cart.forEach(it => {
                const p = products.find(x => x.id === it.id);
                if (!p) return;
                const row = document.createElement('div');
                row.className = 'cart-item';
                row.innerHTML = `
                    <img src="${p.image}" alt="${p.name}">
                    <div>
                        <div class="cart-item-title">${p.name}</div>
                        <div class="qty-row">
                            <button class="qty-btn" data-id="${p.id}" data-action="dec">−</button>
                            <span>${it.qty}</span>
                            <button class="qty-btn" data-id="${p.id}" data-action="inc">+</button>
                            <button class="qty-btn" data-id="${p.id}" data-action="remove" title="Kaldır">×</button>
                        </div>
                    </div>
                    <div class="price-text">${formatPrice(p.price * it.qty)}</div>
                `;
                cartItemsEl.appendChild(row);
            });
            const totals = calcTotals();
            subtotalText.textContent = formatPrice(totals.subtotal);
            shippingText.textContent = formatPrice(totals.shipping);
            totalText.textContent = formatPrice(totals.total);
            renderSummary();
        }

        function renderSummary() {
            if (!summaryItemsEl) return;
            summaryItemsEl.innerHTML = '';
            cart.forEach(it => {
                const p = products.find(x => x.id === it.id);
                if (!p) return;
                const el = document.createElement('div');
                el.className = 'summary-item';
                el.innerHTML = `<span>${p.name} × ${it.qty}</span><span>${formatPrice(p.price * it.qty)}</span>`;
                summaryItemsEl.appendChild(el);
            });
            const totals = calcTotals();
            summarySubtotalEl.textContent = formatPrice(totals.subtotal);
            summaryShippingEl.textContent = formatPrice(totals.shipping);
            summaryTotalEl.textContent = formatPrice(totals.total);
        }

        function openCart() {
            cartDrawer.classList.add('open');
            cartBackdrop.classList.add('visible');
            cartDrawer.setAttribute('aria-hidden', 'false');
        }
        function closeCart() {
            cartDrawer.classList.remove('open');
            cartBackdrop.classList.remove('visible');
            cartDrawer.setAttribute('aria-hidden', 'true');
        }

        // Events: product grid actions
        productGrid?.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const id = target.getAttribute('data-id');
            const action = target.getAttribute('data-action');
            if (action === 'add') {
                addToCart(id, 1);
                openCart();
            } else if (action === 'details') {
                const p = products.find(x => x.id === id);
                if (p) alert(`${p.name}\n\nKağıt: 300gsm Mat\nMürekkep: Arşiv\nKargo: 48 saat içinde`);
            }
        });

        // Events: cart drawer controls
        openCartBtn?.addEventListener('click', () => {
            if (cartDrawer.classList.contains('open')) closeCart();
            else openCart();
        });
        closeCartBtn?.addEventListener('click', closeCart);
        cartBackdrop?.addEventListener('click', closeCart);

        cartItemsEl?.addEventListener('click', (e) => {
            const btn = e.target.closest('.qty-btn');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (action === 'inc') setQty(id, (cart.find(x => x.id === id)?.qty || 1) + 1);
            else if (action === 'dec') setQty(id, (cart.find(x => x.id === id)?.qty || 1) - 1);
            else if (action === 'remove') removeFromCart(id);
        });

        // Search/sort
        searchInput?.addEventListener('input', () => renderProducts(getSortedFiltered()));
        sortSelect?.addEventListener('change', () => renderProducts(getSortedFiltered()));

        // Checkout (create order via API) + PAYTR init
        checkoutForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (cart.length === 0) {
                alert('Sepetiniz boş.');
                return;
            }
            const token = localStorage.getItem('nordic_token') || '';
            if (!token) {
                alert('Siparişi tamamlamak için lütfen giriş yapın.');
                const lm = document.getElementById('loginModal');
                if (lm) lm.classList.add('visible');
                return;
            }
            const inputs = checkoutForm.querySelectorAll('input');
            const name = (inputs[0]?.value || '').trim();
            const email = (inputs[1]?.value || '').trim().toLowerCase();
            const address = (inputs[2]?.value || '').trim();
            const city = (inputs[3]?.value || '').trim();
            const postal = (inputs[4]?.value || '').trim();
            if (!name || !email || !address || !city || !postal) {
                alert('Lütfen teslimat bilgilerini eksiksiz doldurun.');
                return;
            }
            const items = cart.map(it => ({ id: it.id, qty: it.qty }));
            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ name, email, address, city, postal_code: postal, items })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    return alert('Sipariş oluşturulamadı: ' + (err.error || res.status));
                }
                const data = await res.json();

                // Try PAYTR init
                const paytrRes = await fetch('/api/paytr/init', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ orderId: data.orderId })
                });
                let paytr = null;
                if (paytrRes.ok) {
                    paytr = await paytrRes.json();
                }

                if (paytr && paytr.enabled && paytr.token) {
                    const m = document.getElementById('paymentModal');
                    const c = document.getElementById('paymentContainer');
                    c.innerHTML = `<iframe src="https://www.paytr.com/odeme/guvenli/${paytr.token}" frameborder="0" scrolling="auto" style="width:100%;height:600px;"></iframe>`;
                    m.classList.add('visible');
                    m.setAttribute('aria-hidden','false');

                    // Poll order status until paid/cancelled or timeout
                    let elapsed = 0;
                    const pollIntervalMs = 2000;
                    const timeoutMs = 5 * 60 * 1000; // 5 dakika
                    const pollTimer = setInterval(async () => {
                        elapsed += pollIntervalMs;
                        try {
                            const r = await fetch(`/api/orders/${data.orderId}/status`, {
                                headers: { 'Authorization': 'Bearer ' + token }
                            });
                            if (r.ok) {
                                const s = await r.json();
                                if (s.status === 'paid') {
                                    clearInterval(pollTimer);
                                    m.classList.remove('visible');
                                    m.setAttribute('aria-hidden','true');
                                    alert(`Ödeme başarılı. Siparişiniz onaylandı.\nSipariş No: ${data.orderId}`);
                                    cart = [];
                                    saveCart();
                                    updateCartCount();
                                    renderCart();
                                    e.target.reset();
                                } else if (s.status === 'cancelled') {
                                    clearInterval(pollTimer);
                                    m.classList.remove('visible');
                                    m.setAttribute('aria-hidden','true');
                                    alert('Ödeme iptal edildi veya başarısız oldu.');
                                }
                            }
                        } catch {}
                        if (elapsed >= timeoutMs) {
                            clearInterval(pollTimer);
                        }
                    }, pollIntervalMs);
                } else {
                    alert(`Teşekkürler! Siparişiniz alındı.\nSipariş No: ${data.orderId}\nToplam: ${formatPrice(Number(data.total))}`);
                    cart = [];
                    saveCart();
                    updateCartCount();
                    renderCart();
                    e.target.reset();
                }
            } catch {
                alert('Sipariş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
            }
        });

        document.getElementById('paymentClose')?.addEventListener('click', () => {
            const m = document.getElementById('paymentModal');
            m.classList.remove('visible');
            m.setAttribute('aria-hidden','true');
            // Not: ödeme durumu admin panelinden görülebilir; burada sepet temizlenmez.
        });

        // Initialize
        updateCoverflow();
        container.focus();
        startAutoplay();

        // Initialize shop/cart
        loadCart();
        updateCartCount();
        renderProducts(products);
        renderCart();

        // My Orders (user)
        const myOrdersLink = document.getElementById('myOrdersLink');
        const myOrdersList = document.getElementById('myOrdersList');

        function getCurrentUser(){
            try{ const raw = localStorage.getItem('nordic_current_user'); return raw ? JSON.parse(raw) : null; }catch{ return null; }
        }
        function updateUserNav(){
            const user = getCurrentUser();
            if (user){
                if (myOrdersLink) myOrdersLink.style.display = 'inline-block';
            } else {
                if (myOrdersLink) myOrdersLink.style.display = 'none';
            }
        }
        updateUserNav();

        async function renderMyOrders(){
            if (!myOrdersList) return;
            myOrdersList.innerHTML = '';
            const token = localStorage.getItem('nordic_token') || '';
            if (!token) {
                const hint = document.createElement('div');
                hint.textContent = 'Siparişlerinizi görmek için lütfen giriş yapın.';
                myOrdersList.appendChild(hint);
                return;
            }
            try{
                const res = await fetch('/api/orders/mine', { headers: { 'Authorization': 'Bearer ' + token } });
                if (!res.ok) throw new Error('fetch failed');
                const data = await res.json();
                const orders = data?.orders || [];
                if (orders.length === 0){
                    const hint = document.createElement('div');
                    hint.textContent = 'Henüz siparişiniz yok.';
                    myOrdersList.appendChild(hint);
                    return;
                }
                orders.forEach(o => {
                    const row = document.createElement('div');
                    row.className = 'order-row';
                    const created = new Date(o.created_at).toLocaleString('tr-TR');
                    row.innerHTML = `
                        <div>#${o.id}<br><small>${created}</small></div>
                        <div>${o.name}<br><small>${o.email}</small></div>
                        <div>Toplam: ₺${Number(o.total).toFixed(2)}</div>
                        <div>Durum: ${o.status}</div>
                        <div style="display:flex;gap:6px;">
                          <button class="btn" data-id="${o.id}" data-action="details">Detay</button>
                        </div>
                    `;
                    myOrdersList.appendChild(row);
                });
            } catch {
                const hint = document.createElement('div');
                hint.textContent = 'Siparişler alınamadı.';
                myOrdersList.appendChild(hint);
            }
        }

        // My order details modal
        myOrdersList?.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action="details"]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const token = localStorage.getItem('nordic_token') || '';
            try {
                const r = await fetch(`/api/orders/${id}/owner`, { headers: { 'Authorization': 'Bearer ' + token } });
                if (!r.ok) return alert('Sipariş detayları alınamadı.');
                const data = await r.json();
                const o = data.order;
                const items = data.items || [];
                const refunds = data.refunds || [];
                const created = new Date(o.created_at).toLocaleString('tr-TR');
                const body = document.getElementById('myOrderModalBody');
                body.innerHTML = `
                    <div><strong>#${o.id}</strong> • ${created} • Durum: ${o.status}</div>
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
                const m = document.getElementById('myOrderModal');
                m.classList.add('visible');
                m.setAttribute('aria-hidden','false');
            } catch {
                alert('Sipariş detayları alınamadı.');
            }
        });

        document.getElementById('myOrderModalClose')?.addEventListener('click', () => {
            const m = document.getElementById('myOrderModal');
            m.classList.remove('visible');
            m.setAttribute('aria-hidden','true');
        });

        document.getElementById('myOrderModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'myOrderModal'){
                const m = document.getElementById('myOrderModal');
                m.classList.remove('visible');
                m.setAttribute('aria-hidden','true');
            }
        });

        // When navigating to #myorders, render list
        document.querySelector('a#myOrdersLink')?.addEventListener('click', () => {
            setTimeout(renderMyOrders, 100);
        });