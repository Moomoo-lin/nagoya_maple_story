/**
 * 名古屋楓葉物語｜購物清單後端（Google Apps Script）
 * 部署成「網頁應用程式」後，把網址貼到網站購物清單的「同步設定」。
 *
 * 工作表「shopping」欄位：
 * id | tab | brand | name | where | price | desc | map | star | bought | updatedAt
 * 工作表「expenses」（記帳）欄位：
 * id | date | cat | title | amount | cur | payer | status | note | updatedAt
 */
const SHEET_NAME = 'shopping';
const EXP_NAME = 'expenses';
const EXP_HEADERS = ['id','date','cat','title','amount','cur','payer','status','note','updatedAt'];
const HEADERS = ['id','tab','brand','name','where','price','desc','map','star','bought','updatedAt'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readAll_() {
  const sh = sheet_();
  const rows = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    out.push({
      id: String(r[0]), tab: String(r[1]||''), brand: String(r[2]||''), name: String(r[3]||''),
      where: String(r[4]||''), price: String(r[5]||''), desc: String(r[6]||''), map: String(r[7]||''),
      star: r[8] === true || String(r[8]).toUpperCase() === 'TRUE',
      bought: r[9] === true || String(r[9]).toUpperCase() === 'TRUE',
      updatedAt: r[10] ? new Date(r[10]).toISOString() : ''
    });
  }
  return out;
}

function findRow_(sh, id) {
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function toRow_(it) {
  return [it.id, it.tab||'', it.brand||'', it.name||'', it.where||'', it.price||'', it.desc||'', it.map||'',
          !!it.star, !!it.bought, new Date()];
}

function upsert_(it) {
  const sh = sheet_();
  const row = findRow_(sh, it.id);
  if (row > 0) {
    // 只覆蓋有傳來的欄位，bought 若未傳則保留
    const cur = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    const merged = {
      id: it.id, tab: it.tab ?? cur[1], brand: it.brand ?? cur[2], name: it.name ?? cur[3], where: it.where ?? cur[4],
      price: it.price ?? cur[5], desc: it.desc ?? cur[6], map: it.map ?? cur[7],
      star: it.star ?? cur[8], bought: it.bought ?? cur[9]
    };
    sh.getRange(row, 1, 1, HEADERS.length).setValues([toRow_(merged)]);
  } else {
    sh.appendRow(toRow_(it));
  }
}

function remove_(id) {
  const sh = sheet_();
  const row = findRow_(sh, id);
  if (row > 0) sh.deleteRow(row);
}


/* ---------- 記帳（工作表 expenses） ---------- */
function expSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(EXP_NAME);
  if (!sh) sh = ss.insertSheet(EXP_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(EXP_HEADERS); sh.setFrozenRows(1); }
  return sh;
}
function expReadAll_() {
  const rows = expSheet_().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    let d = r[1];
    if (d instanceof Date) d = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
    out.push({ id: String(r[0]), date: String(d||''), cat: String(r[2]||''), title: String(r[3]||''),
      amount: Number(r[4])||0, cur: String(r[5]||'TWD'), payer: String(r[6]||''), status: String(r[7]||'est'),
      note: String(r[8]||'') });
  }
  return out;
}
function expUpsert_(it) {
  const sh = expSheet_();
  const row = findRow_(sh, it.id);
  // 日期存成純文字，避免被試算表轉成日期格式
  const vals = [it.id, "'" + (it.date||''), it.cat||'', it.title||'', Number(it.amount)||0, it.cur||'TWD',
                it.payer||'', it.status||'est', it.note||'', new Date()];
  if (row > 0) sh.getRange(row, 1, 1, EXP_HEADERS.length).setValues([vals]);
  else sh.appendRow(vals);
}
function expRemove_(id) {
  const sh = expSheet_();
  const row = findRow_(sh, id);
  if (row > 0) sh.deleteRow(row);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.sheet === 'expenses')
      return json_({ ok: true, sheet: 'expenses', items: expReadAll_(), serverTime: new Date().toISOString() });
    return json_({ ok: true, items: readAll_(), serverTime: new Date().toISOString() });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const ops = Array.isArray(body.ops) ? body.ops : [body];
    let expTouched = false;
    ops.forEach(op => {
      if (op.action === 'e_upsert' && op.item && op.item.id) { expUpsert_(op.item); expTouched = true; }
      else if (op.action === 'e_delete' && op.id) { expRemove_(op.id); expTouched = true; }
      else if (op.action === 'e_seed' && Array.isArray(op.items)) {
        expTouched = true;
        if (expReadAll_().length === 0) op.items.forEach(expUpsert_);
      }
      else if (op.action === 'upsert' && op.item && op.item.id) upsert_(op.item);
      else if (op.action === 'delete' && op.id) remove_(op.id);
      else if (op.action === 'check' && op.id) upsert_({ id: op.id, bought: !!op.value });
      else if (op.action === 'seed' && Array.isArray(op.items)) {
        // 只在工作表是空的時候灌入預設清單
        if (readAll_().length === 0) op.items.forEach(upsert_);
      }
    });
    if (expTouched) return json_({ ok: true, sheet: 'expenses', items: expReadAll_(), serverTime: new Date().toISOString() });
    return json_({ ok: true, items: readAll_(), serverTime: new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}
