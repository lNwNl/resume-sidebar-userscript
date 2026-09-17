// ==UserScript==
// @name         简历侧边栏
// @namespace    https://github.com/lNwNl/resume-sidebar-userscript
// @version      1.0.1
// @description  先点击网页输入框，再从侧边栏选择简历字段填入
// @match        http://*/*
// @match        https://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  const IS_TOP = window.top === window.self;
  const CHANNEL = '__resume_sidebar_public_v1__';
  const UI_KEY = 'resume_sidebar_public_ui_v1';
  function readUi() {
    if (!IS_TOP || typeof GM_getValue !== 'function') return {};
    try {
      const saved = GM_getValue(UI_KEY, {});
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
  }
  const previousUi = readUi();
  const ui = {
    width: Number.isFinite(previousUi.width)
      ? Math.min(720, Math.max(280, previousUi.width)) : 350,
    fontSize: [12, 14, 16, 18].includes(previousUi.fontSize) ? previousUi.fontSize : 14,
    theme: ['auto', 'light', 'dark'].includes(previousUi.theme) ? previousUi.theme : 'auto'
  };
  function saveUi() {
    if (!IS_TOP || typeof GM_setValue !== 'function') return;
    try { GM_setValue(UI_KEY, ui); } catch { /* 设置无法保存时继续使用当前状态 */ }
  }
  if ('open' in previousUi || 'groups' in previousUi || 'items' in previousUi) saveUi();

  // AI 可只编辑 layouts：name 是分类或条目标题，fields 是可点击填写的字段。
  // 所有值都是虚构示例；发布个人版本前请逐项替换、删除不适用字段。
  const text = (label, value) => ({ label, value, kind: 'text' });
  // date 只接受资料中已有的准确日期；脚本不会根据年月推断或补充具体日期。
  // 只有年月时请使用 text，例如 text('开始时间', '2024.06')。
  const date = (value) => ({ value, kind: 'date' }); // ISO 格式：YYYY-MM-DD
  const period = (start, end) => [
    { ...date(start), label: '开始时间' },
    end ? { ...date(end), label: '结束时间' } : text('结束时间', '至今'),
    { label: '起止时间', kind: 'period', start: date(start), end: end ? date(end) : null }
  ];
  const item = (name, fields) => ({ name, fields });
  const layouts = [
    { name: '基本信息', fields: [
      text('姓名', '示例用户'),
      text('电话', '请替换为本人手机号'),
      text('邮箱', 'user@example.com'),
      text('个人主页', 'https://example.com/profile'),
      { ...date('2000-01-01'), label: '出生日期' },
      text('性别', '请替换为本人性别')
    ] },
    { name: '教育经历', items: [
      item('示例大学 · 研究生', [
        text('学校', '示例大学'), text('学院名称', '示例学院'),
        text('学历', '硕士'), text('专业', '示例专业'),
        ...period('2022-09-01', '2025-07-15'),
        text('主修课程', '示例课程甲、示例课程乙')
      ]),
      item('示例大学 · 本科', [
        text('学校', '示例大学'), text('学院名称', '示例学院'),
        text('学历', '本科'), text('专业', '示例专业'),
        ...period('2018-09-01', '2022-06-30')
      ])
    ] },
    { name: '实习与实践', items: [
      item('示例品牌有限公司', [
        text('公司名称', '示例品牌有限公司'),
        text('岗位名称', '品牌运营实习生'),
        ...period('2024-06-01', '2024-08-31'),
        text('具体内容', '协助整理活动资料、维护内容发布计划，并记录项目进度。')
      ])
    ] },
    { name: '项目经历', items: [
      item('示例活动策划项目', [
        text('项目名称', '示例活动策划项目'),
        ...period('2025-01-01', null), // null 表示仍在进行
        text('项目内容', '整理报名流程、协调活动资源并制作反馈汇总。')
      ])
    ] },
    { name: '专业技能', fields: [
      text('专业技能', '示例：内容编辑、活动策划、表格整理。')
    ] },
    { name: '荣誉证书', items: [
      item('示例奖项', [
        text('名称', '示例奖项'), text('奖项级别', '校级'),
        { ...date('2023-11-01'), label: '获奖时间' }
      ]),
      item('示例证书', [
        text('名称', '示例证书'), text('证书级别', '示例级别'),
        { ...date('2024-05-01'), label: '取得时间' }
      ])
    ] },
    { name: '自我评价', fields: [
      text('长', '这是仅用于演示的长版自我评价。请根据本人真实经历，写明能力、协作方式和求职方向。'),
      text('短', '这是仅用于演示的短版自我评价。请替换为本人真实表述。')
    ] },
    { name: '论文', items: [
      item('示例论文', [
        text('名称', '示例论文'), text('会议名称', '示例会议'),
        text('简述', '请替换为论文的真实内容；没有论文时删除此分类。'),
        text('DOI 链接', 'https://example.com/paper'),
        { ...date('2024-10-01'), label: '发表时间' }
      ])
    ] }
  ];

  const host = document.createElement('div');
  host.setAttribute('data-resume-filler', '');
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; color-scheme: light;
      --bg: #f8fafc; --surface: #fff; --surface-hover: #eef8f5;
      --text: #24344a; --muted: #5d7085; --border: #d8e2e8;
      --accent: #0f766e; --accent-soft: #e4f3ee; --accent-border: #62ada3;
      --shadow: #1d34402b; --toast-bg: #24344a; --toast-text: #fff;
      --toggle-bg: #0f766e; --toggle-text: #fff; }
    :host([data-theme="dark"]) { color-scheme: dark;
      --bg: #111b29; --surface: #1b2939; --surface-hover: #213e43;
      --text: #e6edf3; --muted: #a8bac8; --border: #37495b;
      --accent: #65d6c4; --accent-soft: #1a3e3d; --accent-border: #4ba99b;
      --shadow: #0009; --toast-bg: #deeee9; --toast-text: #142434;
      --toggle-bg: #48c8b6; --toggle-text: #112b2d; }
    * { box-sizing: border-box; }
    button, input, select { font: inherit; }
    .toggle { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
      border: 0; border-radius: 999px; padding: 10px 16px; background: var(--toggle-bg);
      color: var(--toggle-text); box-shadow: 0 4px 16px var(--shadow);
      cursor: pointer; font: 14px system-ui; }
    .panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 2147483647;
      width: min(350px, 100vw); background: var(--bg); color: var(--text);
      box-shadow: -5px 0 24px var(--shadow); display: flex; flex-direction: column;
      font: var(--resume-font-size, 14px)/1.45 system-ui, -apple-system, sans-serif; }
    .grip { position: absolute; top: 0; bottom: 0; left: 0; z-index: 2;
      width: 7px; cursor: ew-resize; touch-action: none; }
    .grip:hover { background: var(--accent-soft); }
    .grip:focus-visible { width: 9px; background: var(--accent-soft); outline: none; }
    [hidden] { display: none !important; }
    .head { display: flex; align-items: center; gap: 8px; padding: 12px 12px 8px; }
    .settings { display: flex; align-items: center; gap: 12px; padding: 0 12px 10px;
      border-bottom: 1px solid var(--border); color: var(--muted); }
    .close { border: 0; background: transparent; color: var(--muted); cursor: pointer;
      font-size: 22px; }
    .setting { flex: 0 0 auto; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
    .setting select { padding: 5px 6px; border: 1px solid var(--border);
      border-radius: 6px; background: var(--surface); color: var(--text); }
    .help-wrap { flex: 0 0 auto; position: relative; }
    .help { width: 27px; height: 27px; border: 1px solid var(--border);
      border-radius: 50%; background: var(--surface); color: var(--accent);
      cursor: help; font-weight: 700; }
    .help:hover, .help:focus-visible { background: var(--accent-soft);
      border-color: var(--accent-border); }
    .help-tip { position: absolute; top: calc(100% + 8px); right: -30px; z-index: 3;
      width: min(240px, calc(100vw - 24px)); padding: 10px 12px;
      border: 1px solid var(--border); border-radius: 7px;
      box-shadow: 0 4px 16px var(--shadow); background: var(--surface);
      color: var(--text); visibility: hidden; pointer-events: none; }
    .help-wrap:hover .help-tip, .help-wrap:focus-within .help-tip { visibility: visible; }
    .search { flex: 1; min-width: 0; padding: 9px; border: 1px solid var(--border);
      border-radius: 7px; background: var(--surface); color: var(--text); }
    .search:focus-visible, .setting select:focus-visible { outline: 2px solid var(--accent-border);
      outline-offset: 1px; }
    .content { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }
    .list { padding: 8px 10px 20px; }
    .group { border-bottom: 1px solid var(--border); padding: 6px 0 9px; }
    .group > summary { cursor: pointer; font-weight: 700; padding: 7px 9px;
      border-left: 3px solid transparent; border-radius: 8px; }
    .group[open] > summary { background: var(--accent-soft);
      border-left-color: var(--accent); }
    .group > summary:hover { background: var(--accent-soft); }
    .item { margin: 9px 0 9px 10px; border: 1px solid var(--border);
      border-radius: 9px; background: var(--surface); overflow: hidden; }
    .item[open] { border-color: var(--accent-border); }
    .item > summary { cursor: pointer; font-weight: 600; padding: 8px 11px;
      color: var(--text); }
    .item[open] > summary { background: var(--surface-hover);
      border-bottom: 1px solid var(--border); }
    .item > summary:hover { background: var(--surface-hover); }
    .group > summary:focus-visible, .item > summary:focus-visible {
      outline: 2px solid var(--accent-border); outline-offset: -2px; }
    .group > .field-row { margin: 0 0 0 10px; border-bottom: 1px solid var(--border); }
    .item > .field-row { margin: 0; }
    .item > .field-row + .field-row { border-top: 1px solid var(--border); }
    .field { width: 100%; display: flex; align-items: baseline; gap: 8px; text-align: left;
      border: 1px solid var(--border); border-radius: 7px; padding: 7px 10px;
      margin: 5px 0; background: var(--surface); color: var(--text); cursor: pointer; }
    .field:hover, .field:focus-visible { border-color: var(--accent-border);
      background: var(--surface-hover); }
    .item .field, .group > .field-row .field { border: 0; border-radius: 0;
      padding: 7px 11px; }
    .item .field:focus-visible, .group > .field-row .field:focus-visible {
      outline: 2px solid var(--accent-border); outline-offset: -2px; }
    .label { flex: 0 0 auto; max-width: 45%; font-weight: 600; overflow-wrap: anywhere; }
    .value { flex: 1 1 auto; min-width: 0; display: -webkit-box;
      -webkit-box-orient: vertical; -webkit-line-clamp: 2;
      overflow: hidden; color: var(--muted);
      font-size: calc(var(--resume-font-size, 14px) - 2px); overflow-wrap: anywhere; }
    .field-row { margin: 5px 0; }
    .field-row .field { margin: 0; }
    .search-hit { padding: 5px 0; border-bottom: 1px solid var(--border); }
    .search-context { margin: 2px 1px; color: var(--muted); font-size: .85em; }
    .no-results { padding: 12px 4px; color: var(--muted); }
    .toast { position: fixed; right: 12px; bottom: 12px; max-width: 340px;
      background: var(--toast-bg); color: var(--toast-text); border-radius: 7px;
      padding: 9px 12px; box-shadow: 0 3px 12px var(--shadow);
      overflow-wrap: anywhere; }
  `;
  root.appendChild(style);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'toggle';
  toggle.textContent = '简历侧边栏';
  toggle.setAttribute('aria-label', '打开简历侧边栏');
  const panel = document.createElement('aside');
  panel.className = 'panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', '简历字段');
  const grip = document.createElement('div');
  grip.className = 'grip';
  grip.setAttribute('role', 'separator');
  grip.setAttribute('aria-orientation', 'vertical');
  grip.setAttribute('aria-label', '侧边栏宽度，拖动或按左右方向键调整');
  grip.setAttribute('aria-valuemin', '280');
  grip.setAttribute('aria-valuemax', '720');
  grip.tabIndex = 0;
  const head = document.createElement('div');
  head.className = 'head';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.textContent = '×';
  close.setAttribute('aria-label', '关闭侧边栏');
  const search = document.createElement('input');
  search.className = 'search';
  search.type = 'search';
  search.placeholder = '搜索字段或内容';
  search.setAttribute('aria-label', '搜索简历字段');
  const size = document.createElement('label');
  size.className = 'setting size';
  size.textContent = '字号';
  const sizeSelect = document.createElement('select');
  sizeSelect.setAttribute('aria-label', '侧边栏字号');
  for (const value of [12, 14, 16, 18]) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = `${value}px`;
    sizeSelect.appendChild(option);
  }
  size.appendChild(sizeSelect);
  sizeSelect.value = String(ui.fontSize);
  const theme = document.createElement('label');
  theme.className = 'setting theme';
  theme.textContent = '外观';
  const themeSelect = document.createElement('select');
  themeSelect.setAttribute('aria-label', '侧边栏外观');
  for (const [value, label] of [['auto', '跟随'], ['light', '浅色'], ['dark', '深色']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    themeSelect.appendChild(option);
  }
  theme.appendChild(themeSelect);
  themeSelect.value = ui.theme;
  const help = document.createElement('button');
  help.type = 'button';
  help.className = 'help';
  help.textContent = '?';
  help.setAttribute('aria-label', '填写与复制说明');
  const helpTip = document.createElement('div');
  helpTip.className = 'help-tip';
  helpTip.id = 'resume-filler-help';
  helpTip.setAttribute('role', 'tooltip');
  helpTip.textContent = '先选网页中的目标字段，再点侧边栏内容填入。Alt + 点击只复制；若未能填入，脚本会自动复制，便于手动粘贴。拖动侧边栏左边缘可调整宽度。';
  help.setAttribute('aria-describedby', helpTip.id);
  const helpWrap = document.createElement('div');
  helpWrap.className = 'help-wrap';
  helpWrap.append(help, helpTip);
  head.append(search, helpWrap, close);
  const settings = document.createElement('div');
  settings.className = 'settings';
  settings.append(size, theme);
  const list = document.createElement('div');
  list.className = 'list';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.hidden = true;
  toast.setAttribute('role', 'alert');
  const content = document.createElement('div');
  content.className = 'content';
  content.append(head, settings, list);
  panel.append(grip, content, toast);
  root.append(toggle, panel);
  if (IS_TOP) document.documentElement.appendChild(host);

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)');
  function applyUi() {
    panel.style.width = `${Math.min(ui.width, window.innerWidth)}px`;
    panel.style.setProperty('--resume-font-size', `${ui.fontSize}px`);
    host.setAttribute('data-theme', ui.theme === 'auto'
      ? (prefersDark?.matches ? 'dark' : 'light') : ui.theme);
    grip.setAttribute('aria-valuenow', String(ui.width));
  }
  applyUi();
  window.addEventListener('resize', applyUi);
  if (IS_TOP) prefersDark?.addEventListener?.('change', () => {
    if (ui.theme === 'auto') applyUi();
  });
  sizeSelect.addEventListener('change', () => {
    ui.fontSize = Number(sizeSelect.value);
    applyUi();
    saveUi();
  });
  themeSelect.addEventListener('change', () => {
    ui.theme = themeSelect.value;
    applyUi();
    saveUi();
  });
  let dragging = null;
  grip.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = event.pointerId;
    grip.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  grip.addEventListener('pointermove', (event) => {
    if (dragging !== event.pointerId) return;
    ui.width = Math.min(720, Math.max(280, window.innerWidth - event.clientX));
    applyUi();
  });
  function finishDrag(event) {
    if (dragging !== event.pointerId) return;
    dragging = null;
    if (grip.hasPointerCapture?.(event.pointerId)) grip.releasePointerCapture(event.pointerId);
    saveUi();
  }
  grip.addEventListener('pointerup', finishDrag);
  grip.addEventListener('pointercancel', finishDrag);
  grip.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    ui.width = Math.min(720, Math.max(280, ui.width + (event.key === 'ArrowLeft' ? 20 : -20)));
    applyUi();
    saveUi();
  });

  let target = null;
  let editorRange = null;
  let activeFrame = null;
  let frameToken = null;
  let toastTimer = null;
  function showError(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  }
  const supportedInputTypes = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'date',
    'month', 'radio', 'checkbox']);

  function editableFrom(node) {
    if (!(node instanceof Element) || host.contains(node)) return null;
    const input = node.closest('input, textarea, select, [contenteditable], '
      + '[role="combobox"], [role="listbox"], [role="radio"], [role="checkbox"]');
    if (!input || input.disabled || input.readOnly) return null;
    if (input instanceof HTMLInputElement) {
      return supportedInputTypes.has(input.type) ? input : null;
    }
    if (input instanceof HTMLTextAreaElement) return input;
    if (input instanceof HTMLSelectElement) return input;
    if (['combobox', 'listbox', 'radio', 'checkbox'].includes(input.getAttribute('role'))) {
      return input.getAttribute('aria-disabled') === 'true' ? null : input;
    }
    return input.isContentEditable ? input : null;
  }

  function sendFrameSignal(cmd) {
    if (IS_TOP) return;
    try {
      window.top.postMessage({ [CHANNEL]: 1, cmd, token: frameToken,
        inputType: target instanceof HTMLInputElement ? target.type : '' }, '*');
    } catch { /* 顶层页面不接收时保留手动复制路径 */ }
  }

  document.addEventListener('focusin', (event) => {
    if (event.target === host) return;
    const candidate = editableFrom(event.target);
    if (candidate) {
      target = candidate;
      editorRange = null;
      if (IS_TOP) activeFrame = null;
      else {
        frameToken = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
        sendFrameSignal('focus');
      }
    } else {
      target = null;
      editorRange = null;
      if (IS_TOP) activeFrame = null;
      else sendFrameSignal('clear');
    }
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (event.target === host || host.contains(event.target)) return;
    if (!editableFrom(event.target)) {
      target = null;
      editorRange = null;
      if (IS_TOP) activeFrame = null;
      else sendFrameSignal('clear');
    }
  }, true);

  document.addEventListener('selectionchange', () => {
    if (!target || !target.isContentEditable) return;
    const selection = document.getSelection();
    if (selection && selection.rangeCount && target.contains(selection.anchorNode)) {
      editorRange = selection.getRangeAt(0).cloneRange();
    }
  });

  function dateFormat(iso, control) {
    const placeholder = control?.getAttribute('placeholder') || '';
    const hint = [placeholder, control?.getAttribute('aria-label') || '', control?.name || '',
      ...(control?.labels ? [...control.labels].map((label) => label.textContent) : [])].join(' ');
    const maxLength = control instanceof HTMLInputElement ? control.maxLength : -1;
    const yearOnly = maxLength === 4 || /^\s*yyyy\s*$/i.test(placeholder);
    const monthOnly = control instanceof HTMLInputElement && control.type === 'month'
      || (maxLength > 0 && maxLength <= 7)
      || (/年月|year.?month|yyyy[.\/-]mm/i.test(hint) && !/日|day|dd/i.test(hint));
    const [year, month, day] = iso.split('-');
    if (yearOnly) return year;
    if (control instanceof HTMLInputElement && control.type === 'date') return iso;
    if (control instanceof HTMLInputElement && control.type === 'month') return `${year}-${month}`;
    if (/年/.test(placeholder)) return `${year}年${month}月${monthOnly ? '' : `${day}日`}`;
    const separator = placeholder.includes('/') ? '/' : placeholder.includes('-') ? '-' : '.';
    return [year, month, ...(!monthOnly ? [day] : [])].join(separator);
  }

  function resolvedValue(field, control) {
    if (field.kind === 'text') return field.value;
    if (field.kind === 'period') {
      if (control instanceof HTMLInputElement && ['date', 'month', 'number'].includes(control.type)
        || control instanceof HTMLSelectElement
        || control instanceof HTMLInputElement && ['radio', 'checkbox'].includes(control.type)
        || ['combobox', 'listbox', 'radio', 'checkbox'].includes(control.getAttribute('role'))) {
        showError('起止时间适用于文本框；日期控件请分别选择开始或结束时间');
        return null;
      }
      const start = dateFormat(field.start.value, control);
      const end = field.end ? dateFormat(field.end.value, control) : '至今';
      return `${start} - ${end}`;
    }
    if (field.value === '至今') return field.value;
    if (control instanceof HTMLInputElement && control.type === 'number') {
      showError('完整日期无法填入数字控件，请选择合适字段');
      return null;
    }
    return dateFormat(field.value, control);
  }

  function normalizedChoice(value) {
    return String(value || '').normalize('NFKC').replace(/\s+/g, '').trim();
  }

  function dateChoices(field, choices, control) {
    const [year, month, day] = field.value.split('-');
    const hint = normalizedChoice([control.getAttribute('aria-label'), control.name,
      ...(control.labels ? [...control.labels].map((label) => label.textContent) : [])].join(' '));
    const nums = choices.map((choice) => {
      const match = /^(\d{1,4})(?:年|月|日)?$/.exec(normalizedChoice(choice));
      return match ? Number(match[1]) : null;
    }).filter((number) => number !== null);
    const numericPart = nums.length >= 2 && nums.length === choices.length
      ? nums.every((number) => number >= 1900 && number <= 2100) ? 'year'
        : nums.every((number) => number >= 1 && number <= 12) ? 'month'
          : nums.every((number) => number >= 1 && number <= 31) && nums.some((number) => number > 12)
            ? 'day' : null
      : null;
    const part = numericPart || (/年份|^年$|year/i.test(hint) ? 'year'
      : /月份|^月$|month/i.test(hint) ? 'month'
        : /^日$|日份|\bday\b/i.test(hint) ? 'day' : null);
    if (part === 'year') return [year, `${year}年`];
    if (part === 'month') return [month, String(Number(month)), `${month}月`, `${Number(month)}月`];
    if (part === 'day') return [day, String(Number(day)), `${day}日`, `${Number(day)}日`];
    return [field.value, field.value.replaceAll('-', '.'), field.value.replaceAll('-', '/'),
      field.value.slice(0, 7), field.value.slice(0, 7).replace('-', '.')];
  }

  function selectMatch(select, field, value) {
    const options = [...select.options].filter((option) => !option.disabled);
    const labels = options.filter((option) => option.value || !/^\s*(?:请选择|选择|select)/i.test(option.textContent))
      .map((option) => option.textContent);
    const candidates = field.kind === 'date' ? dateChoices(field, labels, select) : [value];
    const wanted = new Set(candidates.map(normalizedChoice));
    const matches = options.filter((option) => wanted.has(normalizedChoice(option.value))
      || wanted.has(normalizedChoice(option.textContent)));
    return matches.length === 1 ? matches[0] : null;
  }

  function inputLabel(input) {
    return [input.getAttribute('aria-label') || '',
      ...(input.labels ? [...input.labels].map((label) => label.textContent) : []),
      input.closest('label')?.textContent || ''].map(normalizedChoice).filter(Boolean);
  }

  function checkedMatch(input, field, value) {
    const kind = input.type;
    const scope = input.form || document;
    const peers = [...scope.querySelectorAll(`input[type="${kind}"]`)].filter((peer) =>
      peer.name === input.name && !peer.disabled && (input.name || peer === input));
    const candidates = field.kind === 'date'
      ? dateChoices(field, peers.map((peer) => inputLabel(peer)[0] || peer.value), input)
      : [value];
    const wanted = new Set(candidates.map(normalizedChoice));
    const matches = peers.filter((peer) =>
      (peer.value !== 'on' && wanted.has(normalizedChoice(peer.value)))
      || inputLabel(peer).some((label) => wanted.has(label)));
    return matches.length === 1 ? matches[0] : null;
  }

  async function customOption(control, field, value) {
    const controlled = control.getAttribute('aria-controls');
    const searchRoot = controlled && document.getElementById(controlled) || document;
    const find = () => {
      const options = [...searchRoot.querySelectorAll('[role="option"]')].filter((option) =>
        !option.hidden && option.getAttribute('aria-disabled') !== 'true'
        && option.getAttribute('aria-hidden') !== 'true'
        && getComputedStyle(option).display !== 'none');
      const candidates = field.kind === 'date'
        ? dateChoices(field, options.map((option) => option.textContent), control) : [value];
      const wanted = new Set(candidates.map(normalizedChoice));
      const matches = options.filter((option) => wanted.has(normalizedChoice(option.textContent))
        || wanted.has(normalizedChoice(option.getAttribute('aria-label'))));
      return matches.length === 1 ? matches[0] : null;
    };
    let option = find();
    if (!option) {
      control.click();
      option = find();
    }
    if (!option) {
      option = await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const match = find();
          if (match) { observer.disconnect(); clearTimeout(timer); resolve(match); }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
        const timer = setTimeout(() => { observer.disconnect(); resolve(find()); }, 500);
      });
    }
    if (!option) return false;
    const chosen = normalizedChoice(option.textContent);
    const before = normalizedChoice(control.textContent);
    const beforeValue = normalizedChoice(control.getAttribute('aria-valuetext'));
    option.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const after = normalizedChoice(control.textContent);
    const afterValue = normalizedChoice(control.getAttribute('aria-valuetext'));
    return (after !== before && after.includes(chosen))
      || (afterValue !== beforeValue && afterValue.includes(chosen))
      || option.getAttribute('aria-selected') === 'true';
  }

  async function writeValue(field) {
    toast.hidden = true;
    const control = target;
    if (!control || !control.isConnected || !editableFrom(control)) {
      target = null;
      showError('请先点击网页中的可编辑字段');
      return false;
    }
    const value = resolvedValue(field, control);
    if (value === null) return false;
    if (control instanceof HTMLInputElement && ['radio', 'checkbox'].includes(control.type)) {
      const match = checkedMatch(control, field, value);
      if (!match) { showError('没有唯一匹配的选项'); return false; }
      if (!match.checked) match.click();
      if (!match.checked) { showError('选项未被网站接受'); return false; }
      return true;
    }
    if (control instanceof HTMLSelectElement) {
      const match = selectMatch(control, field, value);
      if (!match) { showError('下拉框没有唯一匹配选项'); return false; }
      if (control.multiple) match.selected = true;
      else control.value = match.value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      return control.multiple ? match.selected : control.value === match.value;
    }
    const role = control.getAttribute('role');
    if (role === 'radio' || role === 'checkbox') {
      const scope = control.closest('[role="radiogroup"], [role="group"]') || control.parentElement;
      const peers = [...scope.querySelectorAll(`[role="${role}"]`)].filter((peer) =>
        peer.getAttribute('aria-disabled') !== 'true');
      const wanted = normalizedChoice(value);
      const matches = peers.filter((peer) => normalizedChoice(peer.getAttribute('aria-label')) === wanted
        || normalizedChoice(peer.textContent) === wanted);
      if (matches.length !== 1) { showError('没有唯一匹配的选项'); return false; }
      if (matches[0].getAttribute('aria-checked') !== 'true') matches[0].click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (matches[0].getAttribute('aria-checked') !== 'true') {
        showError('网站没有确认选中状态，请检查或手动选择');
        return false;
      }
      return true;
    }
    if (role === 'combobox' || role === 'listbox') {
      if (await customOption(control, field, value)) return true;
      showError('没有找到唯一匹配的自定义选项');
      return false;
    }
    if (control instanceof HTMLInputElement && control.type === 'number'
      && !/^[-+]?\d+(\.\d+)?$/.test(value)) {
      showError('数字输入框只能填写数字'); return false;
    }
    if (control instanceof HTMLInputElement && control.type === 'date'
      && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      showError('日期框需要 YYYY-MM-DD 格式'); return false;
    }
    if (control instanceof HTMLInputElement && control.type === 'month'
      && !/^\d{4}-\d{2}$/.test(value)) {
      showError('月份框需要 YYYY-MM 格式'); return false;
    }
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(
        control instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value'
      ).set;
      setter.call(control, value);
      control.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      if (control.value !== value || !control.checkValidity()) {
        showError('网站未接受该值，请检查或手动粘贴'); return false;
      }
      return true;
    }
    control.focus();
    const selection = document.getSelection();
    if (editorRange && control.contains(editorRange.commonAncestorContainer)) {
      selection.removeAllRanges(); selection.addRange(editorRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(control);
      selection.removeAllRanges(); selection.addRange(range);
    }
    if (!document.execCommand?.('insertText', false, value)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(value);
      range.insertNode(node);
      range.setStartAfter(node); range.collapse(true);
      selection.removeAllRanges(); selection.addRange(range);
      control.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    }
    editorRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    if (!control.textContent.includes(value)) {
      showError('正文编辑区未显示该值，请检查或手动粘贴');
      return false;
    }
    return true;
  }

  if (!IS_TOP) {
    window.addEventListener('message', async (event) => {
      const data = event.data;
      if (event.source !== window.top || !/^https?:\/\//.test(event.origin)
        || !data || data[CHANNEL] !== 1 || data.cmd !== 'fill'
        || !frameToken || data.token !== frameToken || !target?.isConnected) return;
      const ok = await writeValue(data.field);
      try {
        event.source.postMessage({ [CHANNEL]: 1, cmd: 'filled', rid: data.rid,
          token: frameToken, ok }, event.origin);
      } catch { /* 来源变化时顶层会超时并提供复制 */ }
    });
    return;
  }

  function sourceIsActiveFrame(source) {
    const active = document.activeElement;
    if (!(active instanceof HTMLIFrameElement)) return false;
    let current = source;
    for (let depth = 0; depth < 8 && current; depth++) {
      if (current === active.contentWindow) return true;
      if (current === window.top) break;
      try { current = current.parent; } catch { break; }
    }
    return false;
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data[CHANNEL] !== 1 || !event.source || !/^https?:\/\//.test(event.origin)) return;
    if (data.cmd === 'focus' && typeof data.token === 'string'
      && sourceIsActiveFrame(event.source)) {
      target = null;
      activeFrame = { source: event.source, origin: event.origin,
        token: data.token, inputType: String(data.inputType || ''), at: Date.now() };
    } else if (data.cmd === 'clear' && activeFrame?.source === event.source
      && activeFrame.token === data.token) {
      activeFrame = null;
    }
  });

  async function deliver(field) {
    if (target?.isConnected) return await writeValue(field) ? 'filled' : 'failed';
    const frame = activeFrame;
    if (!frame || Date.now() - frame.at > 120000) return 'none';
    const rid = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', onReply);
        resolve(result);
      };
      const onReply = (event) => {
        const data = event.data;
        if (event.source !== frame.source || event.origin !== frame.origin
          || !data || data[CHANNEL] !== 1 || data.cmd !== 'filled'
          || data.rid !== rid || data.token !== frame.token) return;
        finish(data.ok ? 'filled' : 'failed');
      };
      window.addEventListener('message', onReply);
      const timer = setTimeout(() => finish('none'), 800);
      try {
        frame.source.postMessage({ [CHANNEL]: 1, cmd: 'fill', rid,
          token: frame.token, field }, frame.origin);
      } catch { finish('none'); }
    });
  }

  function preview(field) {
    if (field.kind === 'date') return field.value.replaceAll('-', '.');
    if (field.kind === 'period') {
      return `${field.start.value.replaceAll('-', '.')} - ${field.end?.value.replaceAll('-', '.') || '至今'}`;
    }
    return field.value;
  }

  function copyContent(field) {
    if (!target && activeFrame && field.kind === 'date') {
      if (activeFrame.inputType === 'date') return field.value;
      if (activeFrame.inputType === 'month') return field.value.slice(0, 7);
    }
    if (target?.isConnected && field.kind === 'date') return dateFormat(field.value, target);
    if (target?.isConnected && field.kind === 'period'
      && !(target instanceof HTMLSelectElement)
      && !(target instanceof HTMLInputElement && ['date', 'month', 'number'].includes(target.type))) {
      return resolvedValue(field, target) || preview(field);
    }
    return preview(field);
  }

  async function copyField(field, automatic = false) {
    const value = copyContent(field);
    try {
      if (typeof GM_setClipboard === 'function') GM_setClipboard(value, 'text');
      else await navigator.clipboard.writeText(value);
      showError(automatic ? '未能自动填写，已复制；请在网页中手动粘贴'
        : '已复制，请在网页中手动粘贴');
      return true;
    } catch {
      showError('复制失败，请检查 Tampermonkey 剪贴板权限');
      return false;
    }
  }

  async function fillField(field) {
    const result = await deliver(field);
    if (result !== 'filled') await copyField(field, true);
  }

  const fieldButtons = [];
  function createFieldRow(field) {
    const fieldRow = document.createElement('div');
    fieldRow.className = 'field-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'field';
    const shown = preview(field);
    button.title = shown;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = field.label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'value';
    valueSpan.textContent = shown;
    button.append(labelSpan, valueSpan);
    button.addEventListener('click', (event) => {
      if (event.altKey) copyField(field);
      else fillField(field);
    });
    fieldRow.appendChild(button);
    return fieldRow;
  }
  function addField(parent, groupName, entryName, field) {
    const fieldRow = createFieldRow(field);
    const shown = preview(field);
    fieldButtons.push({ field, groupName, entryName,
      haystack: `${groupName} ${entryName} ${field.label} ${shown}`.toLocaleLowerCase() });
    parent.appendChild(fieldRow);
  }
  const groupDetailsList = [];
  function closeItems(groupDetails) {
    for (const entry of groupDetails.querySelectorAll(':scope > .item')) entry.open = false;
  }
  for (const group of layouts) {
    const groupDetails = document.createElement('details');
    groupDetails.className = 'group';
    groupDetailsList.push(groupDetails);
    const groupSummary = document.createElement('summary');
    groupSummary.textContent = group.name;
    groupSummary.addEventListener('click', (event) => {
      event.preventDefault();
      const opening = !groupDetails.open;
      groupDetails.open = opening;
      closeItems(groupDetails);
      if (opening) {
        const first = groupDetails.querySelector(':scope > .item');
        if (first) first.open = true;
      }
    });
    groupDetails.appendChild(groupSummary);
    for (const entry of group.items || []) {
      const itemDetails = document.createElement('details');
      itemDetails.className = 'item';
      const itemSummary = document.createElement('summary');
      itemSummary.textContent = entry.name;
      itemDetails.appendChild(itemSummary);
      for (const field of entry.fields)
        addField(itemDetails, group.name, entry.name, field);
      groupDetails.appendChild(itemDetails);
    }
    for (const field of group.fields || [])
      addField(groupDetails, group.name, '', field);
    list.appendChild(groupDetails);
  }

  const searchResults = document.createElement('div');
  searchResults.className = 'search-results';
  searchResults.hidden = true;
  list.prepend(searchResults);

  function setOpen(open) {
    panel.hidden = !open;
    toggle.hidden = open;
    if (open) search.focus();
  }
  toggle.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    searchResults.replaceChildren();
    searchResults.hidden = !query;
    for (const details of groupDetailsList) details.hidden = !!query;
    if (!query) return;
    for (const entry of fieldButtons) {
      if (!entry.haystack.includes(query)) continue;
      const hit = document.createElement('div');
      hit.className = 'search-hit';
      const context = document.createElement('div');
      context.className = 'search-context';
      context.textContent = [entry.groupName, entry.entryName].filter(Boolean).join(' › ');
      hit.append(context, createFieldRow(entry.field));
      searchResults.appendChild(hit);
    }
    if (!searchResults.childElementCount) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = '没有匹配的字段';
      searchResults.appendChild(empty);
    }
  });
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('打开/关闭简历侧边栏', () => setOpen(panel.hidden));
  }
})();
