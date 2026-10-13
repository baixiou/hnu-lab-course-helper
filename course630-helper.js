(() => {
  'use strict';
  const root = window;
  if (root.location.hostname !== '10.62.106.112') {
    root.alert('请在 10.62.106.112 的已登录选课页面点击此书签。');
    return;
  }
  const version = 2;
  if (root.__course630Helper?.version === version) {
    root.__course630Helper.show();
    return;
  }
  if (root.__course630Helper) {
    root.__course630Helper.close();
    root.__course630Pending = true;
  }
  let target = Object.freeze({ name: '固体线膨胀系数的测量', teacher: '张玉婷', date: '2026-12-03', time: '19:00', room: 'B112' });
  const limits = { responseMs: 20000, verifyMs: 12000, totalMs: 15 * 60000, attempts: 60 };
  const norm = value => String(value || '').replace(/\s+/g, '').replace(/：/g, ':');
  const text = el => norm(el?.innerText || el?.textContent || el?.value);
  const visible = el => {
    if (!el?.isConnected || !el.getClientRects().length) return false;
    const style = el.ownerDocument.defaultView.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  };
  function documents(win = root, result = [], seen = new Set()) {
    try {
      if (seen.has(win) || !win.document.body) return result;
      seen.add(win);
      result.push(win.document);
      for (const frame of win.document.querySelectorAll('iframe,frame')) {
        if (visible(frame) && frame.contentWindow) documents(frame.contentWindow, result, seen);
      }
    } catch (_) { /* A different-origin frame cannot be inspected. */ }
    return result;
  }
  function dateValue(value) {
    const found = norm(value).match(/(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})日?/);
    if (!found) return null;
    const [year, month, day] = found.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }
  function timeValue(value) {
    const withoutDate = norm(value).replace(/\d{4}[-\/.年]\d{1,2}[-\/.月]\d{1,2}日?/, ' ');
    const found = withoutDate.match(/(?:^|[^\d])(\d{1,2}):(\d{2})(?!\d)/);
    if (!found || Number(found[1]) > 23 || Number(found[2]) > 59) return null;
    return found[1].padStart(2, '0') + ':' + found[2];
  }
  const identity = parts => {
    const values = parts.flatMap(part => [...part.querySelectorAll('.datagrid-cell,td,[role="cell"]')].map(text));
    return values.includes(target.name) && values.includes(target.teacher)
      && values.some(value => value === target.room || value === '物电院' + target.room)
      && (!target.course || values.includes(target.course))
      && values.some(value => dateValue(value) === target.date && timeValue(value) === target.time);
  };
  function joinedRow(row) {
    const index = row.getAttribute('datagrid-row-index');
    const grid = row.closest('.datagrid-view');
    if (index === null || !grid) return [row];
    return [...grid.querySelectorAll('tr[datagrid-row-index]')]
      .filter(part => part.getAttribute('datagrid-row-index') === index && visible(part));
  }
  function allRows() {
    const result = [], seen = new Set();
    for (const doc of documents()) {
      for (const row of doc.querySelectorAll('tr.datagrid-row,tbody > tr,[role="row"]')) {
        if (!visible(row)) continue;
        const parts = joinedRow(row);
        if (parts.some(part => seen.has(part))) continue;
        parts.forEach(part => seen.add(part));
        result.push({ doc, row, parts, content: parts.map(text).join(' ') });
      }
    }
    return result;
  }
  function rows() { return allRows().filter(row => identity(row.parts)); }
  const controls = container => [...container.querySelectorAll('a,button,input[type="button"],[role="button"]')]
    .filter(el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true'
      && !el.classList.contains('l-btn-disabled'));
  const chooseButtons = row => row.parts.flatMap(controls).filter(el => /^(选修|选课)$/.test(text(el)));
  const hasChooseControl = row => row.parts.some(part => [...part.querySelectorAll('a,button,input[type="button"],[role="button"]')]
    .some(el => visible(el) && /^(选修|选课)$/.test(text(el))));
  const cancelButtons = row => row.parts.flatMap(controls).filter(el => /^(退选|取消选修|取消选课)$/.test(text(el)));
  function rowDetails(row) {
    const grid = row.row.closest('.datagrid-view');
    const cells = row.parts.flatMap(part => [...part.querySelectorAll('td[field],[role="cell"][field]')]);
    function value(labels) {
      if (grid) {
        const header = [...grid.querySelectorAll('.datagrid-header td[field]')].find(el => labels.includes(text(el)));
        if (header) {
          const cell = cells.find(el => el.getAttribute('field') === header.getAttribute('field'));
          if (cell) return text(cell);
        }
      }
      const table = row.row.closest('table');
      if (!table) return '';
      const header = [...table.querySelectorAll('thead th,thead td')].find(el => labels.includes(text(el)));
      return header ? text(row.row.children[header.cellIndex]) : '';
    }
    const name = value(['实验名称']), teacher = value(['授课教师', '任课教师']);
    const time = value(['上课时间', '实验时间']), room = value(['上课教室', '实验教室']);
    const date = dateValue(time), clock = timeValue(time);
    if (!name || !teacher || !room || !date || !clock) return null;
    const numberCell = row.parts.flatMap(part => [...part.querySelectorAll('.datagrid-cell-rownumber,.datagrid-rownumber')])[0];
    const number = value(['序号', '编号']) || text(numberCell);
    return { name, teacher, date, time: clock, room, number, course: value(['课程名称']) };
  }
  function dialogs() {
    const result = [];
    for (const doc of documents()) {
      const candidates = new Set(doc.querySelectorAll('.messager-window,.layui-layer-dialog,[role="alertdialog"],[role="dialog"],.modal.show,.modal.in'));
      for (const body of doc.querySelectorAll('.messager-body,#dialogConfirm,#dialogNoUser')) {
        candidates.add(body.closest('.window,.dialog,.modal') || body);
      }
      for (const el of candidates) {
        if (!visible(el)) continue;
        const body = el.querySelector('.messager-body,.layui-layer-content,.modal-body,#confirmtitle') || el;
        const messageBody = body.cloneNode(true);
        for (const controls of messageBody.querySelectorAll('.messager-button,.dialog-button,.layui-layer-btn,.modal-footer,.window-header,.panel-header,a,button,input,[role="button"]')) controls.remove();
        const message = text(messageBody);
        if (!message || message.includes('可选实验列表') || message.includes('已选实验列表')) continue;
        result.push({ el, doc, message, z: Number(doc.defaultView.getComputedStyle(el).zIndex) || 0 });
      }
    }
    return result.filter(item => !result.some(other => other !== item && item.el.contains(other.el)))
      .sort((a, b) => b.z - a.z);
  }
  function classify(message) {
    const s = norm(message);
    if (/当前人数过多[，,]?请稍后再试/.test(s)
      || /网络忙[，,]?选修失败[，,]?请稍后再试/.test(s)) return 'busy';
    if (/失败|未成功|不成功|尚未|不能|不允许|未开放|冲突|已满|重新登录|登录失效|会话|退选|取消|撤销|删除|退出/.test(s)) return 'unknown';
    if (/选(?:修|课)(?:操作)?成功|成功选(?:修|课)|已成功选(?:修|课)/.test(s)) return 'success';
    if (/已经选(?:修|课)|已选(?:修|课)(?:该|此)?(?:实验|课程)|重复选(?:修|课)/.test(s)) return 'already';
    if (/(确定|确认|是否|您|你).*选(?:修|课)|选(?:修|课).*(确定|确认|[?？])/.test(s)) {
      const dates = s.match(/\d{4}[-\/.年]\d{1,2}[-\/.月]\d{1,2}日?/g) || [];
      const times = s.match(/\d{1,2}:\d{2}/g) || [];
      if (dates.some(date => dateValue(date) !== target.date) || times.some(time => timeValue(time) !== target.time)) return 'unknown';
      return 'confirm';
    }
    return 'unknown';
  }
  function dialogButton(dialog) {
    const buttons = controls(dialog.el).filter(el => /^(确定|确认|是|关闭|OK|Yes)$/i.test(text(el)));
    return buttons.length === 1 ? buttons[0] : null;
  }
  const host = root.document.createElement('div');
  host.id = 'course630-helper-panel';
  host.style.cssText = 'position:fixed;right:18px;top:18px;z-index:2147483647;max-width:calc(100vw - 36px)';
  const ui = host.attachShadow({ mode: 'open' });
  ui.innerHTML = `<style>
    :host{font:14px/1.55 "Microsoft YaHei",sans-serif;color:#162b37}*{box-sizing:border-box}
    section{width:360px;max-width:calc(100vw - 36px);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border:1px solid #cbdde3;border-radius:14px;padding:18px;box-shadow:0 8px 36px #123b4d33}
    header{font-size:18px;font-weight:bold;margin-bottom:9px;display:flex;justify-content:space-between}
    small{color:#647b86;font-size:12px}p{margin:7px 0}.detail{background:#edf7f6;padding:10px;border-radius:8px}
    .status{margin:12px 0;padding:10px;border-radius:8px;background:#f1f4f6;overflow-wrap:anywhere}.status[data-tone="good"]{background:#d9f4df}.status[data-tone="warn"]{background:#fff1d9}
    button{border:1px solid #beced5;background:white;border-radius:7px;padding:8px 12px;cursor:pointer;font:inherit}button:disabled{opacity:.45;cursor:default}#start{background:#087f77;color:white;border-color:#087f77}#stop{color:#a12627}#close{padding:0 5px;border:0;background:transparent}
    nav{display:flex;gap:7px;flex-wrap:wrap}ol{font-size:12px;color:#56717d;padding-left:18px;margin:9px 0 0;max-height:140px;overflow:auto}
    #picker{margin:12px 0;padding:12px;border:1px solid #d5e3e6;border-radius:8px}#picker[hidden]{display:none}label{display:block;font-size:12px;color:#56717d}input,select{font:inherit;width:100%;border:1px solid #b8cdd2;border-radius:6px;background:white;padding:7px;margin:5px 0}select{height:130px;padding:2px}option{padding:5px}#preview{font-size:12px;margin:7px 0;overflow-wrap:anywhere}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #087f77;outline-offset:2px}
  </style><section><header>实验选课助手<button id="close" aria-label="关闭助手">×</button></header>
    <div class="detail"><strong id="target-name"></strong><br><span id="target-date"></span><br><span id="target-place"></span></div>
    <p><button id="switch">切换实验</button></p>
    <div id="picker" hidden><label for="filter">搜索当前页的实验、教师、日期或序号</label><input id="filter" placeholder="例如：光电效应 / 630" autocomplete="off"><label for="choices">当前页可选场次</label><select id="choices" size="5" aria-label="选择实验场次"></select><div id="preview" aria-live="polite"></div><nav><button id="refresh">刷新列表</button><button id="apply" disabled>使用所选实验</button><button id="cancel-picker">收起</button></nav><p><small>其他页的实验：先在网页翻页，再点击“刷新列表”。</small></p></div>
    <p><small>只在这一场实验上操作；最多 60 次，15 分钟。</small></p>
    <div class="status" id="status" role="status" aria-live="polite">正在检查页面…</div>
    <nav><button id="check">检查目标</button><button id="start" disabled>开始选课</button><button id="stop" disabled>停止</button></nav>
    <p><small>按 Esc 也可停止。保持选课页面打开。</small></p><ol id="log"></ol></section>`;
  root.document.body.append(host);
  const get = id => ui.getElementById(id);
  let mode = 'idle', attempts = 0, busyCount = 0, startAt = 0, deadline = 0, retryAt = 0;
  let timer = null, locked = false, confirmationClicked = false, activeDoc = null, selectedTab = null;
  let generation = 0, highlighted = [], hooks = [], nativeEvent = null, synchronousAction = false, candidates = [];
  function renderTarget() {
    get('target-name').textContent = target.name;
    get('target-date').textContent = target.date + ' ' + target.time;
    get('target-place').textContent = target.teacher + ' · ' + (target.room.startsWith('物电院') ? target.room : '物电院 ' + target.room);
  }
  function status(message, tone = '') {
    get('status').textContent = message;
    get('status').dataset.tone = tone;
  }
  function log(message) {
    const item = root.document.createElement('li');
    item.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false }) + ' ' + message;
    get('log').prepend(item);
    while (get('log').children.length > 8) get('log').lastElementChild.remove();
  }
  function running() { return mode !== 'idle'; }
  function unhighlight() {
    for (const [el, old] of highlighted) el.style.outline = old;
    highlighted = [];
  }
  function highlight(row) {
    unhighlight();
    for (const part of row.parts) {
      highlighted.push([part, part.style.outline]);
      part.style.outline = '2px solid #087f77';
    }
  }
  function restoreHooks() {
    for (const h of hooks) {
      try {
        if (h.win.alert === h.alertHook) h.win.alert = h.alert;
        if (h.win.confirm === h.confirmHook) h.win.confirm = h.confirm;
        h.doc.removeEventListener('keydown', escape, true);
      } catch (_) { /* A frame may have navigated after the request. */ }
    }
    hooks = [];
  }
  function finish(message, tone = 'warn') {
    mode = 'idle'; generation++;
    root.clearInterval(timer); timer = null;
    nativeEvent = null; restoreHooks();
    get('start').disabled = true; get('check').disabled = false; get('stop').disabled = true;
    get('switch').disabled = !!root.__course630Pending;
    if (root.__course630Pending) message += ' 请刷新选课网页并核对已选记录后，再启动或切换。';
    status(message, tone); log(message);
  }
  function escape(event) { if (event.key === 'Escape' && running()) finish('已停止。需要继续时点击“检查目标”。'); }
  function installHooks() {
    for (const doc of documents()) {
      const win = doc.defaultView;
      const h = { win, doc, alert: win.alert, confirm: win.confirm };
      h.alertHook = function(message) {
        const kind = classify(message);
        if (running() && doc === activeDoc && mode === 'awaiting' && ['busy', 'success', 'already'].includes(kind)) {
          nativeEvent = { kind, message: String(message) }; return;
        }
        if (running() && doc === activeDoc && mode === 'awaiting') finish('遇到其他提示，已暂停：' + String(message));
        return h.alert.call(win, message);
      };
      h.confirmHook = function(message) {
        if (running() && doc === activeDoc && synchronousAction && mode === 'awaiting'
          && classify(message) === 'confirm' && !confirmationClicked) {
          confirmationClicked = true; log('已确认这一场实验。'); return true;
        }
        if (running()) finish('出现其他确认窗口，已暂停，请核对页面。');
        return h.confirm.call(win, message);
      };
      win.alert = h.alertHook; win.confirm = h.confirmHook;
      doc.addEventListener('keydown', escape, true);
      hooks.push(h);
    }
  }
  function check() {
    if (running()) return;
    if (root.__course630Pending) { get('start').disabled = true; get('switch').disabled = true; status('上一笔操作的结果还不明确。请刷新选课网页，核对已选记录后再打开助手。', 'warn'); return; }
    const matches = rows();
    unhighlight(); get('start').disabled = true;
    if (matches.length !== 1) {
      status(matches.length ? '找到多个相同场次，已暂停，请收窄筛选。' : '当前页未找到目标。请打开目标所在页再检查，或点击“切换实验”选择这一页的场次。', 'warn');
      return;
    }
    highlight(matches[0]);
    if (cancelButtons(matches[0]).length) { status('页面显示该场次已选，请核对已选实验列表。', 'good'); return; }
    if (chooseButtons(matches[0]).length !== 1) { status('已找到场次，但未找到唯一可点击的“选修”，请检查页面。', 'warn'); return; }
    get('start').disabled = false;
    status('已核对实验名称、日期、时间、教师和教室。点击“开始选课”后运行。');
  }
  function previewChoice() {
    const candidate = get('choices').selectedIndex < 0 ? null : candidates[Number(get('choices').value)];
    get('apply').disabled = !candidate || running() || !!root.__course630Pending;
    get('preview').textContent = candidate ? candidate.detail.name + ' · ' + candidate.detail.date + ' ' + candidate.detail.time + ' · ' + candidate.detail.teacher + ' · ' + candidate.detail.room : '没有匹配场次。请检查所在页、刷新列表或修改搜索词。';
  }
  function filterChoices() {
    const query = norm(get('filter').value);
    const choices = get('choices'); choices.replaceChildren();
    candidates.forEach((candidate, index) => {
      const detail = candidate.detail;
      if (query && !norm([detail.number, detail.name, detail.teacher, detail.date, detail.time, detail.room, detail.course].join(' ')).includes(query)) return;
      const option = root.document.createElement('option'); option.value = String(index);
      option.textContent = (detail.number ? detail.number + ' · ' : '') + detail.name;
      choices.append(option);
    });
    choices.selectedIndex = choices.options.length ? 0 : -1;
    previewChoice();
  }
  function refreshChoices() {
    candidates = allRows().filter(row => chooseButtons(row).length === 1).map(row => ({ row, detail: rowDetails(row) })).filter(candidate => candidate.detail);
    filterChoices();
  }
  function openPicker() {
    if (root.__course630Pending || mode === 'verifying') return;
    if (running()) finish('已停止重试。选定其他实验后，点击“开始选课”运行。');
    get('picker').hidden = false; get('filter').value = ''; refreshChoices(); get('filter').focus();
  }
  function applyChoice() {
    if (running() || root.__course630Pending || get('apply').disabled) return;
    const candidate = get('choices').selectedIndex < 0 ? null : candidates[Number(get('choices').value)];
    if (!candidate) return;
    const fresh = rowDetails(candidate.row);
    if (!candidate.row.row.isConnected || !visible(candidate.row.row) || !fresh || ['name', 'teacher', 'date', 'time', 'room', 'course'].some(key => fresh[key] !== candidate.detail[key])) {
      status('页面列表已变化。请刷新列表后重新选择。', 'warn'); get('apply').disabled = true; return;
    }
    target = Object.freeze({ ...fresh }); attempts = 0; busyCount = 0; nativeEvent = null; selectedTab = null;
    renderTarget(); get('picker').hidden = true; log('已切换目标：' + target.name + ' ' + target.date + ' ' + target.time); check();
  }
  function action(el) {
    synchronousAction = true;
    try { el.click(); } finally { synchronousAction = false; }
  }
  function delayRetry(message) {
    root.__course630Pending = false; get('switch').disabled = false;
    busyCount++;
    const seconds = Math.min(30, 5 + (busyCount - 1) * 3);
    retryAt = Date.now() + seconds * 1000; mode = 'retry';
    log(message + '；' + seconds + ' 秒后再试。');
    status('第 ' + attempts + ' 次尝试遇到繁忙提示，' + seconds + ' 秒后再试。');
  }
  function beginVerification(message) {
    root.__course630Pending = false; get('switch').disabled = true;
    mode = 'verifying'; deadline = Date.now() + limits.verifyMs; selectedTab = null;
    status(message + '。正在核对已选实验列表…'); log(message);
  }
  function findSelectedTab() {
    const candidates = [];
    for (const doc of documents()) {
      for (const el of doc.querySelectorAll('[role="tab"],.tabs-title,button,a')) {
        if (visible(el) && text(el) === '已选实验列表') candidates.push(el);
      }
    }
    const unique = candidates.filter(el => !candidates.some(other => other !== el && el.contains(other)));
    return unique.length === 1 ? unique[0] : null;
  }
  function tabActive(tab) {
    const owner = tab.closest('[role="tab"]') || tab.closest('li') || tab;
    return visible(tab) && (owner.getAttribute('aria-selected') === 'true'
      || owner.classList.contains('tabs-selected') || owner.classList.contains('layui-this') || owner.classList.contains('active'));
  }
  function verify() {
    const found = rows().filter(row => cancelButtons(row).length ||
      (selectedTab && tabActive(selectedTab) && row.doc === selectedTab.ownerDocument && !hasChooseControl(row)));
    if (found.length === 1) { finish('已在已选实验列表核对到这一场实验，选课完成。', 'good'); return; }
    if (!selectedTab) {
      selectedTab = findSelectedTab();
      if (selectedTab) { action(selectedTab); return; }
    }
    if (Date.now() >= deadline) finish('页面提示选课结果，但暂未核对到已选记录。已停止，请在“已选实验列表”确认。');
  }
  function attempt() {
    if (attempts >= limits.attempts) { finish('已达到 60 次尝试，停止。可检查页面后重新开始。'); return; }
    const matches = rows();
    if (matches.length !== 1) { finish('目标场次发生变化或不可见，已停止，请检查页面。'); return; }
    const row = matches[0], buttons = chooseButtons(row);
    if (cancelButtons(row).length) { beginVerification('页面显示该场次已选'); return; }
    if (buttons.length !== 1) { finish('目标的“选修”按钮不可用，已停止，请检查已选列表。'); return; }
    highlight(row); activeDoc = row.doc;
    root.__course630Pending = true; get('switch').disabled = true;
    attempts++; confirmationClicked = false; mode = 'awaiting'; deadline = Date.now() + limits.responseMs;
    log('第 ' + attempts + ' 次点击目标场次的“选修”。'); status('第 ' + attempts + ' 次尝试，等待页面结果…');
    action(buttons[0]);
  }
  function tick() {
    if (locked || !running()) return;
    locked = true;
    try {
      if (Date.now() - startAt >= limits.totalMs) { finish('运行已达 15 分钟，已停止。'); return; }
      if (!host.isConnected) { finish('助手已从页面移除，已停止。'); return; }
      if (nativeEvent) {
        const event = nativeEvent; nativeEvent = null;
        if (event.kind === 'busy') delayRetry(event.message);
        else beginVerification(event.kind === 'success' ? '页面提示选修成功' : '页面提示该场次已经选过');
        return;
      }
      const currentDialogs = dialogs();
      if (currentDialogs.length) {
        const dialog = currentDialogs[0], kind = classify(dialog.message), button = dialogButton(dialog);
        if (!button) { finish('检测到弹窗，但无法确定操作按钮，已暂停：' + dialog.message); return; }
        if (kind === 'busy') {
          const before = generation; action(button);
          if (generation === before && running()) delayRetry(dialog.message);
          return;
        }
        if (kind === 'confirm' && mode === 'awaiting' && !confirmationClicked) {
          confirmationClicked = true; action(button); log('已确认这一场实验。'); return;
        }
        if (kind === 'success' || kind === 'already') {
          const before = generation; action(button);
          if (generation === before && running()) beginVerification(kind === 'success' ? '页面提示选修成功' : '页面提示该场次已经选过');
          return;
        }
        finish('遇到其他提示，已暂停：' + dialog.message); return;
      }
      if (mode === 'verifying') { verify(); return; }
      if (mode === 'retry') {
        if (Date.now() >= retryAt) attempt();
        else status('等待 ' + Math.ceil((retryAt - Date.now()) / 1000) + ' 秒后重试；已尝试 ' + attempts + ' 次。');
        return;
      }
      if (mode === 'ready') { attempt(); return; }
      if (mode === 'awaiting' && Date.now() >= deadline) finish('20 秒内未读到明确结果，已停止。请先核对已选列表，避免重复提交。');
    } catch (error) { finish('页面操作失败，已停止：' + error.message); }
    finally { locked = false; }
  }
  function start() {
    if (running() || root.__course630Pending || get('start').disabled) return;
    attempts = 0; busyCount = 0; startAt = Date.now(); mode = 'ready'; generation++;
    selectedTab = null; nativeEvent = null; activeDoc = null;
    get('start').disabled = true; get('check').disabled = true; get('stop').disabled = false;
    get('picker').hidden = true;
    installHooks(); timer = root.setInterval(tick, 400); tick();
  }
  function close() {
    finish('助手已关闭。'); unhighlight(); host.remove(); delete root.__course630Helper;
  }
  get('check').addEventListener('click', check); get('start').addEventListener('click', start);
  get('switch').addEventListener('click', openPicker); get('refresh').addEventListener('click', refreshChoices);
  get('filter').addEventListener('input', filterChoices); get('choices').addEventListener('change', previewChoice);
  get('apply').addEventListener('click', applyChoice); get('cancel-picker').addEventListener('click', () => { get('picker').hidden = true; });
  get('stop').addEventListener('click', () => finish('已停止。需要继续时点击“检查目标”。'));
  get('close').addEventListener('click', close);
  root.__course630Helper = { version, show: () => { host.style.display = ''; if (!running()) check(); }, close };
  renderTarget();
  check();
})();
