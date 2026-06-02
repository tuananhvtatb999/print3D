/* ===========================================
   PRINT3D — app.js
   Pure vanilla JS, GitHub Pages compatible
   =========================================== */

(function () {
  'use strict';

  /* ─── State ──────────────────────────────── */
  let allModels = [];
  let allCategories = [];
  let activeCategory = 'all';

  /* ─── DOM refs ───────────────────────────── */
  const catNav    = document.getElementById('category-nav');
  const grid      = document.getElementById('model-grid');
  const countEl   = document.getElementById('item-count');
  const sectionLbl = document.getElementById('section-label');
  const lightbox  = document.getElementById('lightbox');
  const lbTrack   = document.getElementById('lb-track');
  const lbDots    = document.getElementById('lb-dots');
  const lbPrev    = document.getElementById('lb-prev');
  const lbNext    = document.getElementById('lb-next');
  const lbCat     = document.getElementById('lb-cat');
  const lbName    = document.getElementById('lb-name');
  const lbDesc    = document.getElementById('lb-desc');
  const lbClose   = document.getElementById('lb-close');
  const backTop   = document.getElementById('back-top');

  let currentSlide = 0;
  let slideImages  = [];

  /* ─── Helpers ────────────────────────────── */
  function getCatLabel(catId) {
    const cat = allCategories.find(c => c.id === catId);
    return cat ? cat.label : catId;
  }

  function getCatIcon(catId) {
    const cat = allCategories.find(c => c.id === catId);
    return cat ? cat.icon : '⬡';
  }

  function getModelImages(model) {
    if (Array.isArray(model.images) && model.images.length) return model.images;
    if (model.image) {
      const src = model.image.startsWith('data:') ? model.image : `images/${model.category}/${model.image}`;
      return [src];
    }
    return [];
  }

  /* ─── Intersection Observer lazy load ───── */
  let imgObserver = null;

  function initObserver() {
    if (!('IntersectionObserver' in window)) return null;
    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.src;
        if (!src) return;

        img.src = src;
        img.addEventListener('load', () => {
          img.classList.add('img-loaded');
          img.closest('.card-img-wrap')?.classList.remove('img-loading');
        }, { once: true });
        img.addEventListener('error', () => {
          img.src = 'https://placehold.co/600x600/1a1a2e/ff6b2b?text=No+Image';
          img.classList.add('img-loaded');
          img.closest('.card-img-wrap')?.classList.remove('img-loading');
        }, { once: true });

        imgObserver.unobserve(img);
      });
    }, { rootMargin: '200px' });
  }

  function observeImages() {
    const imgs = grid.querySelectorAll('img[data-src]');
    if (!imgObserver) {
      /* Fallback: load all immediately if IntersectionObserver unavailable */
      imgs.forEach(img => {
        img.src = img.dataset.src;
        img.classList.add('img-loaded');
        img.closest('.card-img-wrap')?.classList.remove('img-loading');
      });
      return;
    }
    imgs.forEach(img => imgObserver.observe(img));
  }

  /* ─── Skeleton loader ────────────────────── */
  function showSkeletons(count = 8) {
    grid.innerHTML = Array.from({ length: count }, () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join('');
  }

  /* ─── Render categories ──────────────────── */
  function renderCategories(categories) {
    const allBtn = { id: 'all', label: 'Tất cả', icon: '⬡' };
    const list   = [allBtn, ...categories];
    catNav.innerHTML = list.map(cat => `
      <button
        class="cat-btn${cat.id === activeCategory ? ' active' : ''}"
        data-cat="${cat.id}"
        aria-pressed="${cat.id === activeCategory}"
      >
        <span class="cat-icon" aria-hidden="true">${cat.icon}</span>
        ${cat.label}
      </button>
    `).join('');

    catNav.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => selectCategory(btn.dataset.cat));
    });
  }

  /* ─── Render model cards ─────────────────── */
  function renderModels(models) {
    if (!models.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>Chưa có mô hình nào trong danh mục này.</p>
        </div>`;
      countEl.textContent = '0 mẫu';
      return;
    }

    countEl.textContent = `${models.length} mẫu`;

    if (!imgObserver) imgObserver = initObserver();

    grid.innerHTML = models.map((m, i) => {
      const imgs = getModelImages(m);
      const firstSrc = imgs[0] || '';
      const countBadge = imgs.length > 1 ? `<span class="card-img-count">📷 ${imgs.length}</span>` : '';
      return `
      <article
        class="model-card"
        data-id="${m.id}"
        style="animation-delay: ${i * 0.04}s"
        role="button"
        tabindex="0"
        aria-label="Xem ${m.name}"
      >
        <div class="card-img-wrap img-loading">
          <img
            data-src="${firstSrc}"
            alt="${m.name}"
            decoding="async"
          >
          <div class="card-img-overlay" aria-hidden="true">
            <div class="zoom-icon">🔍</div>
          </div>
          <span class="card-cat-chip">${getCatIcon(m.category)} ${getCatLabel(m.category)}</span>
          ${countBadge}
        </div>
        <div class="card-body">
          <h3 class="card-name">${m.name}</h3>
          <p class="card-desc">${m.description}</p>
          <div class="card-footer">
            <button class="card-order-btn" data-id="${m.id}" aria-label="Đặt hàng ${m.name}">
              Đặt in →
            </button>
            <span class="card-id">#${String(m.id).padStart(3, '0')}</span>
          </div>
        </div>
      </article>
    `; }).join('');

    /* Attach click events */
    grid.querySelectorAll('.model-card').forEach(card => {
      card.addEventListener('click', (e) => {
        /* Prevent lightbox when clicking "Đặt in" button */
        if (e.target.closest('.card-order-btn')) return;
        const model = allModels.find(m => m.id === parseInt(card.dataset.id));
        if (model) openLightbox(model);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    observeImages();

    /* "Đặt in" button — scroll to contact / show alert for now */
    grid.querySelectorAll('.card-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const model = allModels.find(m => m.id === parseInt(btn.dataset.id));
        if (model) scrollToContact(model);
      });
    });
  }

  /* ─── Select category ────────────────────── */
  function selectCategory(catId) {
    activeCategory = catId;

    /* Update buttons */
    catNav.querySelectorAll('.cat-btn').forEach(btn => {
      const isActive = btn.dataset.cat === catId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    /* Update section label */
    sectionLbl.textContent = catId === 'all' ? 'Tất cả mô hình' : getCatLabel(catId);

    /* Filter and render */
    const filtered = catId === 'all'
      ? allModels
      : allModels.filter(m => m.category === catId);

    renderModels(filtered);
  }

  /* ─── Lightbox slider ───────────────────── */
  function goToSlide(i) {
    currentSlide = i;
    lbTrack.style.transform = `translateX(-${i * 100}%)`;
    lbDots.querySelectorAll('.lb-dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
    lbPrev.hidden = i === 0;
    lbNext.hidden = i === slideImages.length - 1;
  }

  function openLightbox(model) {
    slideImages = getModelImages(model);

    lbTrack.innerHTML = slideImages.map(src => `
      <div class="lb-slide"><img src="${src}" alt="${model.name}" loading="lazy"></div>
    `).join('');

    if (slideImages.length > 1) {
      lbDots.innerHTML = slideImages.map((_, i) =>
        `<button class="lb-dot${i === 0 ? ' active' : ''}" aria-label="Ảnh ${i + 1}"></button>`
      ).join('');
      lbDots.querySelectorAll('.lb-dot').forEach((dot, i) =>
        dot.addEventListener('click', () => goToSlide(i))
      );
    } else {
      lbDots.innerHTML = '';
    }

    lbCat.textContent  = `${getCatIcon(model.category)} ${getCatLabel(model.category)}`;
    lbName.textContent = model.name;
    lbDesc.textContent = model.description;

    goToSlide(0);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  lbPrev.addEventListener('click', () => goToSlide(currentSlide - 1));
  lbNext.addEventListener('click', () => goToSlide(currentSlide + 1));
  lbClose.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft'  && currentSlide > 0)                    goToSlide(currentSlide - 1);
    if (e.key === 'ArrowRight' && currentSlide < slideImages.length - 1) goToSlide(currentSlide + 1);
  });

  /* ─── Order / contact ────────────────────── */
  function scrollToContact(model) {
    const footer = document.getElementById('footer');
    footer.scrollIntoView({ behavior: 'smooth' });
    /* In a real site: pre-fill a contact form with model.name */
  }

  /* "Đặt in ngay" in lightbox */
  document.getElementById('lb-cta').addEventListener('click', () => {
    const name = lbName.textContent;
    closeLightbox();
    const footer = document.getElementById('footer');
    footer.scrollIntoView({ behavior: 'smooth' });
  });

  /* ─── Back to top ────────────────────────── */
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ─── Fetch data & init ──────────────────── */
  async function init() {
    showSkeletons(8);

    try {
      /* GitHub Pages: relative path works from any subpath */
      const base = document.querySelector('meta[name="base-path"]')?.content || '.';
      const response = await fetch(`${base}/data/models.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      allModels     = data.models     || [];
      allCategories = data.categories || [];

      renderCategories(allCategories);
      renderModels(allModels);

    } catch (err) {
      console.error('[PRINT3D] Failed to load models:', err);
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Không thể tải dữ liệu. Vui lòng thử lại.</p>
          <p style="font-size:0.7rem;margin-top:.5rem;color:var(--text-dim)">${err.message}</p>
        </div>`;
    }
  }

  /* ─── Admin ─────────────────────────────── */
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'admin123';
  const SESSION_KEY = 'p3d_admin';

  const adminToggle      = document.getElementById('admin-toggle');
  const loginModal       = document.getElementById('login-modal');
  const loginForm        = document.getElementById('login-form');
  const loginUserEl      = document.getElementById('login-user');
  const loginPassEl      = document.getElementById('login-pass');
  const loginError       = document.getElementById('login-error');
  const loginCancel      = document.getElementById('login-cancel');
  const adminPanel       = document.getElementById('admin-panel');
  const adminLogout      = document.getElementById('admin-logout');
  const adminAddForm     = document.getElementById('admin-add-form');
  const adminListEl      = document.getElementById('admin-model-list');
  const adminCountEl     = document.getElementById('admin-model-count');
  const connectFolderBtn = document.getElementById('connect-folder-btn');
  const folderBar        = document.getElementById('folder-bar');
  const folderBarText    = document.getElementById('folder-bar-text');
  const saveIndicator    = document.getElementById('save-indicator');
  const afCat            = document.getElementById('af-cat');
  const adminCatForm     = document.getElementById('admin-cat-form');
  const adminCatList     = document.getElementById('admin-cat-list');
  const afFileInput      = document.getElementById('af-file-input');
  const afThumbnails     = document.getElementById('af-thumbnails');

  let modelsFileHandle  = null;
  let pendingImagesData = [];

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function updateToggleState() {
    if (isLoggedIn()) {
      adminToggle.title = 'Admin Panel';
      adminToggle.setAttribute('aria-label', 'Mở Admin Panel');
    } else {
      adminToggle.title = 'Đăng nhập Admin';
      adminToggle.setAttribute('aria-label', 'Đăng nhập Admin');
      adminToggle.classList.remove('active');
    }
  }

  function openLoginModal() {
    loginForm.reset();
    loginError.classList.remove('visible');
    loginModal.classList.add('open');
    loginUserEl.focus();
  }

  function closeLoginModal() {
    loginModal.classList.remove('open');
  }

  function openAdminPanel() {
    adminPanel.classList.add('open');
    adminToggle.classList.add('active');
    renderCatAdminList();
    renderAdminList();
  }

  function closeAdminPanel() {
    adminPanel.classList.remove('open');
    adminToggle.classList.remove('active');
  }

  function populateCategorySelect() {
    afCat.innerHTML = '<option value="">-- Chọn danh mục --</option>';
    allCategories
      .filter(c => c.id !== 'all')
      .forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.icon} ${c.label}`;
        afCat.appendChild(opt);
      });
  }

  function renderCatAdminList() {
    adminCatList.innerHTML = '';
    allCategories.filter(c => c.id !== 'all').forEach(c => {
      const item = document.createElement('div');
      item.className = 'admin-model-item';

      const info = document.createElement('div');
      info.className = 'item-info';

      const name = document.createElement('div');
      name.className = 'item-name';
      name.textContent = `${c.icon} ${c.label}`;

      const id = document.createElement('div');
      id.className = 'item-cat';
      id.textContent = c.id;

      const del = document.createElement('button');
      del.className = 'btn-delete';
      del.textContent = '✕';
      del.setAttribute('aria-label', `Xóa danh mục ${c.label}`);
      del.addEventListener('click', () => deleteCategory(c.id));

      info.appendChild(name);
      info.appendChild(id);
      item.appendChild(info);
      item.appendChild(del);
      adminCatList.appendChild(item);
    });
  }

  function deleteCategory(id) {
    const inUse = allModels.some(m => m.category === id);
    if (inUse) {
      alert(`Danh mục này đang có mô hình. Xóa các mô hình thuộc danh mục trước.`);
      return;
    }
    allCategories = allCategories.filter(c => c.id !== id);
    renderCategories(allCategories);
    populateCategorySelect();
    renderCatAdminList();
    autoSave();
  }

  function updateFolderBar() {
    if (modelsFileHandle) {
      folderBar.className = 'folder-bar connected';
      folderBarText.textContent = `✓ ${modelsFileHandle.name}`;
      connectFolderBtn.textContent = 'Đổi';
    } else {
      folderBar.className = 'folder-bar disconnected';
      folderBarText.textContent = 'Chưa kết nối data/models.json';
      connectFolderBtn.textContent = 'Kết nối';
    }
  }

  async function autoSave() {
    if (!modelsFileHandle) return;
    try {
      saveIndicator.textContent = 'Đang lưu...';
      const writable = await modelsFileHandle.createWritable();
      await writable.write(JSON.stringify({ categories: allCategories, models: allModels }, null, 2));
      await writable.close();
      saveIndicator.textContent = '✓ Đã lưu';
      setTimeout(() => { saveIndicator.textContent = ''; }, 2000);
    } catch (err) {
      saveIndicator.textContent = '⚠ Lỗi';
      console.error('[PRINT3D] autoSave failed:', err);
    }
  }

  function renderAdminList() {
    adminCountEl.textContent = allModels.length;
    adminListEl.innerHTML = '';
    allModels.forEach(m => {
      const item = document.createElement('div');
      item.className = 'admin-model-item';

      const info = document.createElement('div');
      info.className = 'item-info';

      const name = document.createElement('div');
      name.className = 'item-name';
      name.textContent = m.name;

      const cat = document.createElement('div');
      cat.className = 'item-cat';
      cat.textContent = `${getCatIcon(m.category)} ${getCatLabel(m.category)}`;

      const del = document.createElement('button');
      del.className = 'btn-delete';
      del.textContent = '✕';
      del.setAttribute('aria-label', `Xóa ${m.name}`);
      del.addEventListener('click', () => deleteModel(m.id));

      info.appendChild(name);
      info.appendChild(cat);
      item.appendChild(info);
      item.appendChild(del);
      adminListEl.appendChild(item);
    });
  }

  function deleteModel(id) {
    allModels = allModels.filter(m => m.id !== id);
    const filtered = activeCategory === 'all'
      ? allModels
      : allModels.filter(m => m.category === activeCategory);
    renderModels(filtered);
    renderAdminList();
    autoSave();
  }

  function exportJSON() {
    const data = { categories: allCategories, models: allModels };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'models.json';
    a.click();
    URL.revokeObjectURL(url);
    pendingChanges = 0;
    unsavedBadge.style.display = 'none';
  }

  /* Tab switching */
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');

      if (tab.dataset.tab === 'products') populateCategorySelect();
    });
  });

  adminToggle.addEventListener('click', () => {
    if (isLoggedIn()) {
      adminPanel.classList.contains('open') ? closeAdminPanel() : openAdminPanel();
    } else {
      openLoginModal();
    }
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (loginUserEl.value.trim() === ADMIN_USER && loginPassEl.value === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, '1');
      closeLoginModal();
      updateToggleState();
      populateCategorySelect();
      openAdminPanel();
    } else {
      loginError.classList.add('visible');
      loginPassEl.value = '';
      loginPassEl.focus();
    }
  });

  loginCancel.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', e => { if (e.target === loginModal) closeLoginModal(); });

  adminLogout.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    closeAdminPanel();
    updateToggleState();
  });

  adminAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd   = new FormData(adminAddForm);
    const name = fd.get('name').trim();
    const cat  = fd.get('category');
    const desc = fd.get('description').trim();
    if (!name || !cat || !pendingImagesData.length || !desc) return;

    const newId = allModels.length ? Math.max(...allModels.map(m => m.id)) + 1 : 1;
    allModels.push({ id: newId, category: cat, name, description: desc, images: [...pendingImagesData] });

    const filtered = activeCategory === 'all'
      ? allModels
      : allModels.filter(m => m.category === activeCategory);
    renderModels(filtered);
    renderAdminList();
    autoSave();

    adminAddForm.reset();
    pendingImagesData = [];
    renderAdminThumbs();
  });

  adminCatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd    = new FormData(adminCatForm);
    const icon  = fd.get('icon').trim() || '⬡';
    const label = fd.get('label').trim();
    const id    = fd.get('id').trim().toLowerCase().replace(/\s+/g, '-');
    if (!label || !id) return;
    if (allCategories.some(c => c.id === id)) {
      alert('ID này đã tồn tại, hãy chọn ID khác.');
      return;
    }
    allCategories.push({ id, label, icon });
    renderCategories(allCategories);
    populateCategorySelect();
    renderCatAdminList();
    autoSave();
    adminCatForm.reset();
  });

  /* Resize image and convert to base64 */
  function resizeToBase64(file, maxSize = 600, quality = 0.82) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = url;
    });
  }

  /* Image file picker */
  function renderAdminThumbs() {
    if (!pendingImagesData.length) { afThumbnails.innerHTML = ''; return; }
    afThumbnails.innerHTML = pendingImagesData.map((src, i) => `
      <div class="af-thumb">
        <img src="${src}" alt="">
        <button class="af-thumb-remove" data-i="${i}" aria-label="Xóa ảnh ${i + 1}">✕</button>
      </div>
    `).join('');
    afThumbnails.querySelectorAll('.af-thumb-remove').forEach(btn =>
      btn.addEventListener('click', () => {
        pendingImagesData.splice(+btn.dataset.i, 1);
        renderAdminThumbs();
      })
    );
  }

  afFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      pendingImagesData.push(await resizeToBase64(file));
    }
    afFileInput.value = '';
    renderAdminThumbs();
  });

  connectFolderBtn.addEventListener('click', async () => {
    if (!('showOpenFilePicker' in window)) {
      alert('Dùng Chrome hoặc Edge để kết nối file.');
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        excludeAcceptAllOption: true,
        multiple: false
      });
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        modelsFileHandle = handle;
        updateFolderBar();
      }
    } catch (_) { /* user cancelled */ }
  });

  /* ─── Run ─────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    updateToggleState();
    init();
  });

})();
