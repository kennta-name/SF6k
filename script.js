/* =========================================================
   SF6 攻略ガイド — 共通スクリプト
   1. ヘッダーのスクロール状態
   2. ハンバーガーメニュー（ドロワー）
   3. 初回案内モーダル（localStorage）
   4. スクロールフェードイン
   5. カードのポインター追従・ドラッグ演出
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- localStorage を安全に使う ---------- */
  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* プライベートモード等では無視 */ } },
  };

  /* ---------- スクロールロック（モーダル・ドロワー共用） ---------- */
  let lockCount = 0;
  const lockScroll = () => { if (lockCount++ === 0) document.body.classList.add('is-locked'); };
  const unlockScroll = () => { if (--lockCount <= 0) { lockCount = 0; document.body.classList.remove('is-locked'); } };

  /* ---------- フォーカストラップ ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* =========================================================
     1. ヘッダー
     ========================================================= */
  const header = $('#siteHeader');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========================================================
     2. ドロワーメニュー
     ========================================================= */
  const menuBtn = $('#menuBtn');
  const drawer = $('#drawer');
  const overlay = $('#drawerOverlay');
  const drawerClose = $('#drawerClose');
  let drawerOpen = false;

  function openDrawer() {
    if (drawerOpen || !drawer) return;
    drawerOpen = true;
    overlay.hidden = false;
    // hidden 解除 → 次フレームでクラス付与してトランジションを効かせる
    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
    });
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'メニューを閉じる');
    lockScroll();
    setTimeout(() => drawerClose && drawerClose.focus(), 300);
  }

  function closeDrawer({ returnFocus = true } = {}) {
    if (!drawerOpen) return;
    drawerOpen = false;
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'メニューを開く');
    unlockScroll();
    setTimeout(() => { if (!drawerOpen) overlay.hidden = true; }, 420);
    if (returnFocus) menuBtn.focus();
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', () => (drawerOpen ? closeDrawer() : openDrawer()));
    drawerClose && drawerClose.addEventListener('click', () => closeDrawer());
    overlay.addEventListener('click', () => closeDrawer());
    drawer.addEventListener('keydown', e => trapFocus(drawer, e));
    // ページ内リンクをクリックしたら閉じる
    $$('.drawer-link', drawer).forEach(link => link.addEventListener('click', () => closeDrawer({ returnFocus: false })));
  }

  /* =========================================================
     3. 初回案内モーダル
     ========================================================= */
  const GUIDE_KEY = 'sf6guide:visited';
  const modal = $('#guideModal');
  let modalOpen = false;
  let lastFocus = null;

  function openModal() {
    if (!modal || modalOpen) return;
    modalOpen = true;
    lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
    lockScroll();
    setTimeout(() => { const s = $('#guideStart'); s && s.focus(); }, 200);
  }

  function closeModal() {
    if (!modalOpen) return;
    modalOpen = false;
    storage.set(GUIDE_KEY, '1'); // 次回以降は自動表示しない
    modal.classList.remove('is-open');
    unlockScroll();
    setTimeout(() => { if (!modalOpen) modal.hidden = true; }, 450);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (modal) {
    $('#guideSkip').addEventListener('click', closeModal);
    $('#guideStart').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeModal(); });
    modal.addEventListener('keydown', e => trapFocus(modal, e));

    if (!storage.get(GUIDE_KEY)) {
      // ページの表示が落ち着いてから出す
      setTimeout(openModal, reduceMotion ? 0 : 600);
    }
  }

  // MENU内「使い方をもう一度見る」
  const reopen = $('#reopenGuide');
  reopen && reopen.addEventListener('click', () => {
    closeDrawer({ returnFocus: false });
    setTimeout(openModal, 350);
  });

  // Esc で閉じる（モーダル優先）
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modalOpen) closeModal();
    else if (drawerOpen) closeDrawer();
  });

  /* =========================================================
     4. スクロールフェードイン
     ========================================================= */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // 同じ親の中で順番に少しずつ遅らせる
        const siblings = $$('.reveal', el.parentElement);
        const index = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = `${Math.min(index * 80, 480)}ms`;
        el.classList.add('is-visible');
        // 表示後は遅延をリセット（ホバー等の反応を遅らせないため）
        setTimeout(() => { el.style.transitionDelay = ''; }, 1400);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* =========================================================
     5. カード：ポインター追従の光 ＋ ドラッグ演出
        - ホバー：光（--mx/--my）がカーソルを追従、カードが軽く傾く
        - ドラッグ：カードが指/マウスに少し引っ張られ、光の玉が追従。
                    離すとバネのように元の位置へ戻る
        - 少しでも動かした場合はクリック（ページ遷移）を無効化
     ========================================================= */
  const DRAG_THRESHOLD = 6;     // px：これ以上動いたらドラッグ扱い
  const PULL = 0.18;            // ドラッグ量に対してカードが動く割合
  const MAX_PULL = 26;          // px：カードが動く最大量
  const MAX_TILT = 8;           // deg：最大傾き

  $$('.card').forEach(card => {
    let dragging = false;
    let moved = false;
    let startX = 0, startY = 0;
    let pointerId = null;

    const setLight = (clientX, clientY) => {
      const r = card.getBoundingClientRect();
      const x = clientX - r.left, y = clientY - r.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      return { r, x, y };
    };

    const setTilt = (r, x, y, strength = 1) => {
      if (reduceMotion) return;
      const px = x / r.width - 0.5;   // -0.5〜0.5
      const py = y / r.height - 0.5;
      card.style.setProperty('--ry', `${(px * MAX_TILT * 2 * strength).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-py * MAX_TILT * 2 * strength).toFixed(2)}deg`);
    };

    const resetTransform = () => {
      ['--rx', '--ry'].forEach(p => card.style.setProperty(p, '0deg'));
      ['--tx', '--ty'].forEach(p => card.style.setProperty(p, '0px'));
    };

    // ホバー（マウスのみ）
    card.addEventListener('pointermove', e => {
      if (dragging) return;
      const { r, x, y } = setLight(e.clientX, e.clientY);
      if (e.pointerType === 'mouse') setTilt(r, x, y, 0.5);
    });
    card.addEventListener('pointerleave', () => { if (!dragging) resetTransform(); });

    // ドラッグ開始
    card.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      setLight(e.clientX, e.clientY);
    });

    // ドラッグ中（window で拾ってカード外に出ても追従）
    window.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        moved = true;
        card.classList.add('is-dragging');
        try { card.setPointerCapture(pointerId); } catch (_) {}
      }
      if (!moved) return;

      const { r, x, y } = setLight(e.clientX, e.clientY);
      if (!reduceMotion) {
        const clamp = v => Math.max(-MAX_PULL, Math.min(MAX_PULL, v));
        card.style.setProperty('--tx', `${clamp(dx * PULL).toFixed(1)}px`);
        card.style.setProperty('--ty', `${clamp(dy * PULL).toFixed(1)}px`);
        setTilt(r, x, y, 1);
      }
    });

    const endDrag = e => {
      if (!dragging || (e && e.pointerId !== pointerId)) return;
      dragging = false;
      card.classList.remove('is-dragging');
      try { card.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      resetTransform();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // ドラッグした場合はリンク遷移させない
    card.addEventListener('click', e => {
      if (moved) { e.preventDefault(); moved = false; }
    });
    // ブラウザ標準のリンク画像ドラッグを無効化
    card.addEventListener('dragstart', e => e.preventDefault());
  });
})();

/* =========================================================
   Phase 2 — 下層ページ用
   6. 画像プレースホルダー（画像が無い時は枠を表示）
   7. 目次の現在地ハイライト
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 6. 画像プレースホルダー ---------- */
  document.querySelectorAll('.media-frame img').forEach(img => {
    const frame = img.closest('.media-frame');
    if (!frame.dataset.label) frame.dataset.label = img.alt || '';
    const markMissing = () => frame.classList.add('is-missing');
    const markLoaded = () => frame.classList.remove('is-missing');
    if (!img.getAttribute('src')) { markMissing(); return; }
    if (img.complete) { img.naturalWidth ? markLoaded() : markMissing(); }
    img.addEventListener('error', markMissing);
    img.addEventListener('load', markLoaded);
  });

  /* ---------- 7. 目次ハイライト ---------- */
  const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
  if (!tocLinks.length || !('IntersectionObserver' in window)) return;

  const map = new Map();
  tocLinks.forEach(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) map.set(sec, a);
  });

  const visible = new Set();
  const update = () => {
    // 画面内で一番上にあるセクションをアクティブにする
    let top = null;
    visible.forEach(sec => { if (!top || sec.offsetTop < top.offsetTop) top = sec; });
    tocLinks.forEach(a => a.classList.remove('is-active'));
    if (top) map.get(top).classList.add('is-active');
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    update();
  }, { rootMargin: '-30% 0px -55% 0px' });

  map.forEach((_, sec) => io.observe(sec));
})();

/* =========================================================
   Phase 3 — キャラクター選択・詳細ページ
   8. キャラ選択：フィルター／検索／プレビュー／ドラッグ演出
   9. タブ切り替え（コンボ分類など）
   ========================================================= */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- トースト ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('is-show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2200);
  }

  /* =========================================================
     8. キャラクター選択
     ========================================================= */
  const grid = document.getElementById('charGrid');
  if (grid) {
    const cards = [...grid.querySelectorAll('.char-card')];
    const preview = document.getElementById('charPreview');
    const pv = preview && {
      frame: preview.querySelector('.media-frame'),
      img: preview.querySelector('img'),
      en: preview.querySelector('.preview-en'),
      name: preview.querySelector('.preview-name'),
      year: preview.querySelector('[data-pv="year"]'),
      status: preview.querySelector('[data-pv="status"]'),
      cta: preview.querySelector('.preview-cta'),
    };
    let current = null;

    /* プレビュー更新 */
    function showPreview(card) {
      if (!pv || card === current) return;
      current = card;
      cards.forEach(c => c.classList.toggle('is-active', c === card));
      const d = card.dataset;
      preview.classList.add('is-switching');
      setTimeout(() => {
        pv.en.textContent = d.en;
        pv.name.textContent = d.name;
        pv.year.textContent = d.yearLabel;
        const ready = d.status === 'ready', soon = d.status === 'soon';
        pv.status.textContent = ready ? 'コンボ掲載中' : soon ? (d.note || '配信予定') : 'データ準備中';
        pv.status.className = ready ? 'is-ready' : soon ? 'is-soon' : '';
        pv.cta.href = ready ? card.getAttribute('href') : '#';
        pv.cta.setAttribute('aria-disabled', ready ? 'false' : 'true');
        pv.cta.textContent = ready ? `${d.name} の攻略を見る` : 'データ準備中';
        pv.frame.dataset.label = d.name;
        pv.frame.classList.remove('is-missing');
        pv.img.alt = d.name;
        pv.img.src = card.querySelector('img').getAttribute('src');
        preview.classList.remove('is-switching');
      }, reduceMotion ? 0 : 180);
    }
    if (pv) {
      pv.img.addEventListener('error', () => pv.frame.classList.add('is-missing'));
      pv.img.addEventListener('load', () => pv.frame.classList.remove('is-missing'));
    }

    /* フィルター＆検索 */
    const tabs = [...document.querySelectorAll('.filter-tab')];
    const search = document.getElementById('charSearch');
    const countEl = document.getElementById('resultCount');
    const empty = document.getElementById('emptyMsg');
    let group = 'all';
    // ひらがな→カタカナ変換（「りゅう」でも「リュウ」にヒット）
    const kata = s => s.replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
    const norm = s => kata((s || '').toLowerCase().replace(/[\s.・]/g, ''));

    function applyFilter() {
      const q = norm(search ? search.value : '');
      let n = 0;
      cards.forEach(c => {
        const okGroup = group === 'all' || c.dataset.group === group;
        const okText = !q || norm(c.dataset.name + c.dataset.en + (c.dataset.kana || '')).includes(q);
        const show = okGroup && okText;
        const wasHidden = c.classList.contains('is-hidden');
        c.classList.toggle('is-hidden', !show);
        if (show) {
          n++;
          if (wasHidden && !reduceMotion) {
            c.classList.remove('pop-in'); void c.offsetWidth;
            c.style.animationDelay = `${Math.min(n * 25, 400)}ms`;
            c.classList.add('pop-in');
          }
        }
      });
      if (countEl) countEl.textContent = `${n} / ${cards.length} CHARACTERS`;
      if (empty) empty.hidden = n !== 0;
    }
    tabs.forEach(t => t.addEventListener('click', () => {
      group = t.dataset.group;
      tabs.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
      applyFilter();
    }));
    search && search.addEventListener('input', applyFilter);
    applyFilter();

    /* ホバー・フォーカス・ドラッグ */
    const PULL = 0.15, MAX_PULL = 18, MAX_TILT = 10;
    cards.forEach(card => {
      let dragging = false, moved = false, sx = 0, sy = 0, pid = null;
      const light = e => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`); card.style.setProperty('--my', `${y}px`);
        return { r, x, y };
      };
      const tilt = (r, x, y, k) => {
        if (reduceMotion) return;
        card.style.setProperty('--ry', `${((x / r.width - .5) * MAX_TILT * 2 * k).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-(y / r.height - .5) * MAX_TILT * 2 * k).toFixed(2)}deg`);
      };
      const reset = () => {
        ['--rx', '--ry'].forEach(p => card.style.setProperty(p, '0deg'));
        ['--tx', '--ty'].forEach(p => card.style.setProperty(p, '0px'));
      };

      card.addEventListener('pointerenter', () => showPreview(card));
      card.addEventListener('focus', () => showPreview(card));
      card.addEventListener('pointermove', e => {
        if (dragging) return;
        const { r, x, y } = light(e);
        if (e.pointerType === 'mouse') tilt(r, x, y, .5);
      });
      card.addEventListener('pointerleave', () => { if (!dragging) reset(); });
      card.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        dragging = true; moved = false; pid = e.pointerId; sx = e.clientX; sy = e.clientY;
        showPreview(card); light(e);
      });
      window.addEventListener('pointermove', e => {
        if (!dragging || e.pointerId !== pid) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) > 6) {
          moved = true; card.classList.add('is-dragging');
          try { card.setPointerCapture(pid); } catch (_) {}
        }
        if (!moved) return;
        const { r, x, y } = light(e);
        if (!reduceMotion) {
          const c = v => Math.max(-MAX_PULL, Math.min(MAX_PULL, v));
          card.style.setProperty('--tx', `${c(dx * PULL).toFixed(1)}px`);
          card.style.setProperty('--ty', `${c(dy * PULL).toFixed(1)}px`);
          tilt(r, x, y, 1);
        }
      });
      const end = e => {
        if (!dragging || (e && e.pointerId !== pid)) return;
        dragging = false; card.classList.remove('is-dragging');
        try { card.releasePointerCapture(pid); } catch (_) {}
        pid = null; reset();
      };
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      card.addEventListener('dragstart', e => e.preventDefault());
      card.addEventListener('click', e => {
        if (moved) { e.preventDefault(); moved = false; return; }
        if (card.dataset.status !== 'ready') {
          e.preventDefault();
          toast(card.dataset.status === 'soon'
            ? `${card.dataset.name}：${card.dataset.note || '配信予定'}です`
            : `${card.dataset.name} のデータは準備中です`);
        }
      });
    });

    // 初期表示：最初のキャラをプレビュー
    const first = cards.find(c => c.dataset.status === 'ready') || cards[0];
    first && showPreview(first);
  }

  /* =========================================================
     9. タブ（[data-tabs] 内の .tab-btn / .tab-panel）
     ========================================================= */
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const btns = [...root.querySelectorAll('.tab-btn')];
    const panels = btns.map(b => document.getElementById(b.getAttribute('aria-controls')));
    function select(i, focus, updateHash = false) {
      btns.forEach((b, j) => {
        const on = i === j;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
        if (on) { panels[j].classList.remove('is-entering'); void panels[j].offsetWidth; panels[j].classList.add('is-entering'); }
      });
      if (focus) btns[i].focus();
      // ユーザーが選んだ時だけURLに反映（初期表示でページが飛ばないように）
      if (updateHash) history.replaceState(null, '', `#${btns[i].getAttribute('aria-controls')}`);
    }
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(i, false, true));
      b.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') select((i + 1) % btns.length, true, true);
        if (e.key === 'ArrowLeft') select((i - 1 + btns.length) % btns.length, true, true);
      });
    });
    // URLのハッシュでタブを直接開く（例 #combo-corner）
    const fromHash = btns.findIndex(b => `#${b.getAttribute('aria-controls')}` === location.hash);
    select(fromHash >= 0 ? fromHash : 0);
  });
})();

/* =========================================================
   Phase 4 — 日記ページ
   10. カテゴリー／月別アーカイブで記事を絞り込み
   ========================================================= */
(() => {
  'use strict';
  const posts = [...document.querySelectorAll('.post-card')];
  if (!posts.length) return;
  const btns = [...document.querySelectorAll('[data-filter-key]')];
  const status = document.getElementById('filterStatus');
  const statusText = document.getElementById('filterStatusText');
  const clearBtn = document.getElementById('filterClear');

  function apply(key, value, label) {
    let n = 0;
    posts.forEach(p => {
      const show = !key || value === 'all' || p.dataset[key] === value;
      p.classList.toggle('is-hidden', !show);
      if (show) n++;
    });
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filterKey === key && b.dataset.filterValue === value)));
    if (status) {
      const filtered = key && value !== 'all';
      status.hidden = !filtered;
      if (filtered) statusText.textContent = `「${label}」の記事：${n}件`;
    }
  }
  btns.forEach(b => b.addEventListener('click', () => {
    apply(b.dataset.filterKey, b.dataset.filterValue, b.dataset.label || b.textContent.trim());
    const list = document.getElementById('postList');
    if (list && window.innerWidth < 960) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  clearBtn && clearBtn.addEventListener('click', () => apply('cat', 'all', ''));

  // 件数を自動で数えてサイドバーに表示
  btns.forEach(b => {
    const n = b.querySelector('.n');
    if (!n) return;
    const { filterKey: k, filterValue: v } = b.dataset;
    n.textContent = v === 'all' ? posts.length : posts.filter(p => p.dataset[k] === v).length;
  });
})();
