const PATHS = {
  GENERAL: './GENERAL_template.json',
  PRISMA: './TEMPLATES/PRISMA_template.json'
};

let template = null;
let state = {};

const $ = (id) => document.getElementById(id);
const PLACEHOLDER = '[PLACEHOLDER]';

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Não foi possível carregar ${path}`);
  return res.json();
}

function cleanValue(value) {
  if (value === undefined || value === null || value === PLACEHOLDER) return '';
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
}

function valueOrPlaceholder(value) {
  const v = cleanValue(value).trim();
  return v ? escapeHtml(v).replace(/\n/g, '<br>') : '<span class="placeholder">[PLACEHOLDER]</span>';
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setAtPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur)) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function getAtPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeInput(path, label, type = 'text', value = '', example = '') {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;
  const input = type === 'textarea' || type === 'rich_text' ? document.createElement('textarea') : document.createElement('input');
  input.value = cleanValue(value);
  if (example) input.placeholder = `Ex: ${example}`;
  input.dataset.path = path;
  input.addEventListener('input', () => {
    setAtPath(state, input.dataset.path, input.value);
    updatePreview();
  });
  wrapper.appendChild(input);
  return wrapper;
}

function renderStatus() {
  const select = $('statusSelect');
  select.innerHTML = '';
  const opts = template?.document?.status_options || ['Rascunho', 'Registrado', 'Em revisão', 'Submetido', 'Publicado'];
  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    select.appendChild(opt);
  });
  select.value = state.status || opts[0];
  select.onchange = () => { state.status = select.value; updatePreview(); };
}

function renderFrontMatter() {
  const box = $('frontMatter');
  box.innerHTML = '';

  if (template.front_matter) {
    state.front_matter = state.front_matter || clone(template.front_matter);
    Object.entries(state.front_matter).forEach(([key, field]) => {
      box.appendChild(makeInput(`front_matter.${key}.value`, field.label || key, field.type || 'text', field.value, field.example));
    });
  } else if (template.fields) {
    state.fields = state.fields || clone(template.fields);
    Object.entries(state.fields).forEach(([key, val]) => {
      const isLong = ['resumo', 'abstract'].includes(key);
      box.appendChild(makeInput(`fields.${key}`, key.toUpperCase(), isLong ? 'textarea' : 'text', val));
    });
  }
}

function renderAbstracts() {
  const box = $('abstractFields');
  box.innerHTML = '';
  if (template.abstracts) {
    state.abstracts = state.abstracts || clone(template.abstracts);
    Object.entries(state.abstracts).forEach(([key, field]) => {
      box.appendChild(makeInput(`abstracts.${key}.value`, field.label || key, field.type || 'textarea', field.value));
    });
  } else if (state.fields) {
    ['resumo', 'palavras_chave', 'abstract', 'keywords'].forEach(key => {
      if (key in state.fields) box.appendChild(makeInput(`fields.${key}`, key.toUpperCase(), key.includes('abstract') || key === 'resumo' ? 'textarea' : 'text', state.fields[key]));
    });
  }
}

function renderPrisma() {
  const card = $('prismaCard');
  const box = $('prismaFields');
  box.innerHTML = '';
  const prisma = state.prisma_module || state.prisma;
  if (!prisma) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  if (prisma.pico) {
    const h = document.createElement('h3'); h.textContent = 'PICO / PICOS'; box.appendChild(h);
    Object.entries(prisma.pico).forEach(([key, val]) => box.appendChild(makeInput(`prisma.pico.${key}`, key.toUpperCase(), 'textarea', val)));
  }

  if (prisma.flowchart) {
    const h = document.createElement('h3'); h.textContent = 'Fluxograma PRISMA'; box.appendChild(h);
    Object.entries(prisma.flowchart).forEach(([key, val]) => box.appendChild(makeInput(`${state.prisma ? 'prisma' : 'prisma_module'}.flowchart.${key}`, key.replaceAll('_', ' ').toUpperCase(), 'text', val)));
  }

  if (prisma.tables) {
    const h = document.createElement('h3'); h.textContent = 'Tabelas'; box.appendChild(h);
    Object.entries(prisma.tables).forEach(([key, val]) => box.appendChild(makeInput(`prisma.tables.${key}`, key.replaceAll('_', ' ').toUpperCase(), 'textarea', val)));
  }
}

function renderFramework() {
  const card = $('frameworkCard');
  const box = $('frameworkFields');
  box.innerHTML = '';
  if (!state.framework_module) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  Object.entries(state.framework_module.fields || {}).forEach(([key, field]) => {
    box.appendChild(makeInput(`framework_module.fields.${key}.value`, field.label || key, field.type || 'textarea', field.value));
  });
}

function renderSections() {
  const box = $('sectionsEditor');
  const nav = $('sectionNav');
  box.innerHTML = '';
  nav.innerHTML = '';
  state.sections = state.sections || [];

  state.sections.forEach((sec, i) => {
    const block = document.createElement('div');
    block.className = 'section-block';
    block.id = `edit-section-${sec.id}`;
    block.innerHTML = `<div class="section-title"><h3>${escapeHtml(sec.id)} ${escapeHtml(sec.title)}</h3></div>`;
    block.appendChild(makeInput(`sections.${i}.title`, 'Título da seção', 'text', sec.title));
    block.appendChild(makeInput(`sections.${i}.content`, 'Conteúdo', 'textarea', sec.content));

    if (sec.fields) {
      Object.entries(sec.fields).forEach(([key, val]) => block.appendChild(makeInput(`sections.${i}.fields.${key}`, key.toUpperCase(), 'textarea', val)));
    }

    (sec.subsections || []).forEach((sub, j) => {
      const subBlock = document.createElement('div');
      subBlock.className = 'subsection';
      subBlock.innerHTML = `<h3>${escapeHtml(sub.id)} ${escapeHtml(sub.title)}</h3>`;
      subBlock.appendChild(makeInput(`sections.${i}.subsections.${j}.title`, 'Título da subseção', 'text', sub.title, sub.example));
      if (sub.content !== undefined) subBlock.appendChild(makeInput(`sections.${i}.subsections.${j}.content`, 'Conteúdo', 'textarea', sub.content));
      if (sub.fields) Object.entries(sub.fields).forEach(([key, val]) => subBlock.appendChild(makeInput(`sections.${i}.subsections.${j}.fields.${key}`, key.toUpperCase(), 'textarea', val)));
      block.appendChild(subBlock);
    });

    box.appendChild(block);

    const link = document.createElement('a');
    link.href = `#edit-section-${sec.id}`;
    link.textContent = `${sec.id}. ${sec.title}`;
    nav.appendChild(link);
  });
}

function collectProjectMeta() {
  state.protocol_name = $('protocolName').value;
  state.template_selected = $('templateSelect').value;
  state.updated_at = new Date().toISOString();
}

function updatePreview() {
  collectProjectMeta();
  const preview = $('preview');
  let html = '';

  const fm = state.front_matter;
  const fields = state.fields;
  const title = fm?.title?.value || fields?.title || state.protocol_name || PLACEHOLDER;
  const author = fm?.author?.value || fields?.author || PLACEHOLDER;
  const institution = fm?.institution?.value || fields?.institution || PLACEHOLDER;
  const city = fm?.city_state?.value || fields?.city_state || PLACEHOLDER;
  const year = fm?.year?.value || fields?.year || PLACEHOLDER;

  html += `<h1>${valueOrPlaceholder(title)}</h1>`;
  html += `<p><strong>Autor:</strong> ${valueOrPlaceholder(author)}</p>`;
  html += `<p><strong>Instituição:</strong> ${valueOrPlaceholder(institution)}</p>`;
  html += `<p><strong>Local/Ano:</strong> ${valueOrPlaceholder(city)} — ${valueOrPlaceholder(year)}</p>`;

  const resumo = state.abstracts?.resumo?.value || fields?.resumo;
  const abs = state.abstracts?.abstract?.value || fields?.abstract;
  html += `<h2>RESUMO</h2><p>${valueOrPlaceholder(resumo)}</p>`;
  html += `<h2>ABSTRACT</h2><p>${valueOrPlaceholder(abs)}</p>`;
  html += `<h2>SUMÁRIO</h2>`;
  html += `<ol>${(state.sections || []).map(s => `<li>${escapeHtml(s.title)} <span class="placeholder">[página]</span></li>`).join('')}</ol>`;

  (state.sections || []).forEach(sec => {
    html += `<h2>${escapeHtml(sec.id)} ${escapeHtml(sec.title)}</h2>`;
    if (sec.content !== undefined) html += `<p>${valueOrPlaceholder(sec.content)}</p>`;
    if (sec.fields) Object.entries(sec.fields).forEach(([key, val]) => html += `<p><strong>${escapeHtml(key)}:</strong> ${valueOrPlaceholder(val)}</p>`);
    (sec.subsections || []).forEach(sub => {
      html += `<h3>${escapeHtml(sub.id)} ${escapeHtml(sub.title)}</h3>`;
      if (sub.content !== undefined) html += `<p>${valueOrPlaceholder(sub.content)}</p>`;
      if (sub.fields) Object.entries(sub.fields).forEach(([key, val]) => html += `<p><strong>${escapeHtml(key)}:</strong> ${valueOrPlaceholder(val)}</p>`);
    });
  });

  preview.innerHTML = html;
}

async function generateHash() {
  collectProjectMeta();
  const data = new TextEncoder().encode(JSON.stringify(state));
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  $('hashBox').value = hash;
  state.sha256 = hash;
  return hash;
}

function download(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function init(selected = 'GENERAL') {
  template = await loadJson(PATHS[selected]);
  state = clone(template);
  $('protocolName').value = state.protocol_name || '';
  $('templateSelect').value = selected;
  renderStatus();
  renderFrontMatter();
  renderAbstracts();
  renderPrisma();
  renderFramework();
  renderSections();
  updatePreview();
}


function stripHtmlToText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function getDocumentData() {
  updatePreview();
  collectProjectMeta();
  const fm = state.front_matter;
  const fields = state.fields;
  const title = cleanValue(fm?.title?.value || fields?.title || state.protocol_name || 'Documento científico');
  const author = cleanValue(fm?.author?.value || fields?.author || '');
  const institution = cleanValue(fm?.institution?.value || fields?.institution || '');
  const city = cleanValue(fm?.city_state?.value || fields?.city_state || '');
  const year = cleanValue(fm?.year?.value || fields?.year || '');
  return { title, author, institution, city, year };
}

function xmlEscape(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function docxParagraph(text, style = '') {
  const safe = xmlEscape(text || '[PLACEHOLDER]').replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>');
  const pStyle = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  return `<w:p>${pStyle}<w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

function buildDocxXml() {
  const meta = getDocumentData();
  let body = '';
  body += docxParagraph(meta.title.toUpperCase(), 'Title');
  if (meta.author) body += docxParagraph(meta.author, 'Normal');
  if (meta.institution) body += docxParagraph(meta.institution, 'Normal');
  if (meta.city || meta.year) body += docxParagraph(`${meta.city}${meta.city && meta.year ? ' - ' : ''}${meta.year}`, 'Normal');

  const resumo = state.abstracts?.resumo?.value || state.fields?.resumo || '[PLACEHOLDER]';
  const abs = state.abstracts?.abstract?.value || state.fields?.abstract || '[PLACEHOLDER]';
  body += docxParagraph('RESUMO', 'Heading1');
  body += docxParagraph(cleanValue(resumo), 'Normal');
  body += docxParagraph('ABSTRACT', 'Heading1');
  body += docxParagraph(cleanValue(abs), 'Normal');
  body += docxParagraph('SUMÁRIO', 'Heading1');
  (state.sections || []).forEach(sec => body += docxParagraph(`${sec.id} ${sec.title} ................................ [página]`, 'Normal'));

  (state.sections || []).forEach(sec => {
    body += docxParagraph(`${sec.id} ${sec.title}`, 'Heading1');
    if (sec.content !== undefined) body += docxParagraph(cleanValue(sec.content), 'Normal');
    if (sec.fields) Object.entries(sec.fields).forEach(([key, val]) => body += docxParagraph(`${key}: ${cleanValue(val)}`, 'Normal'));
    (sec.subsections || []).forEach(sub => {
      body += docxParagraph(`${sub.id} ${sub.title}`, 'Heading2');
      if (sub.content !== undefined) body += docxParagraph(cleanValue(sub.content), 'Normal');
      if (sub.fields) Object.entries(sub.fields).forEach(([key, val]) => body += docxParagraph(`${key}: ${cleanValue(val)}`, 'Normal'));
    });
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c >>> 0;
    }
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ -1) >>> 0;
}

function u16(n) { return [n & 255, (n >>> 8) & 255]; }
function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
function strBytes(s) { return Array.from(new TextEncoder().encode(s)); }
function concatBytes(parts) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  parts.forEach(p => { out.set(p, off); off += p.length; });
  return out;
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(file => {
    const name = strBytes(file.name);
    const data = new TextEncoder().encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
      ...name, ...data
    ]);
    localParts.push(local);
    const central = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name
    ]);
    centralParts.push(central);
    offset += local.length;
  });
  const centralSize = centralParts.reduce((a, p) => a + p.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0)
  ]);
  return concatBytes([...localParts, ...centralParts, end]);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportDocx() {
  const meta = getDocumentData();
  const safeName = (state.protocol_name || meta.title || 'documento_cientifico').toLowerCase().replace(/[^a-z0-9]+/gi, '_');
  const files = [
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>` },
    { name: 'word/_rels/document.xml.rels', content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>` },
    { name: 'word/styles.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:pPr><w:spacing w:before="360" w:after="160"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr></w:style>
</w:styles>` },
    { name: 'word/document.xml', content: buildDocxXml() }
  ];
  const zip = makeZip(files);
  downloadBlob(`${safeName}.docx`, new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
}

$('btnLoadTemplate').addEventListener('click', () => init($('templateSelect').value));
function getDraftKey() {
  const name = ($('protocolName')?.value || state.protocol_name || 'default').trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_');
  return `delyone_research_2_draft_${name || 'default'}`;
}

async function saveDraftLocal() {
  collectProjectMeta();
  localStorage.setItem(getDraftKey(), JSON.stringify(state));
  alert('Documento salvo neste navegador. Ele não foi enviado para servidor.');
}

function loadDraftLocal() {
  const raw = localStorage.getItem(getDraftKey());
  if (!raw) {
    alert('Nenhum documento salvo encontrado neste navegador para este nome de protocolo.');
    return;
  }
  try {
    state = JSON.parse(raw);
    $('protocolName').value = state.protocol_name || '';
    $('templateSelect').value = state.template_selected || $('templateSelect').value;
    renderStatus();
    renderFrontMatter();
    renderAbstracts();
    renderPrisma();
    renderFramework();
    renderSections();
    updatePreview();
    alert('Documento recuperado deste navegador.');
  } catch (err) {
    alert('Não foi possível carregar o rascunho local.');
  }
}

$('btnSaveDraft').addEventListener('click', saveDraftLocal);
$('btnLoadDraft').addEventListener('click', loadDraftLocal);
$('btnExportDocx').addEventListener('click', exportDocx);
$('btnExportPdf').addEventListener('click', () => { updatePreview(); window.print(); });
$('btnRefreshPreview').addEventListener('click', updatePreview);

init().catch(err => {
  document.body.innerHTML = `<main class="card"><h1>Erro ao carregar app</h1><p>${escapeHtml(err.message)}</p><p>Abra este arquivo por um servidor local, GitHub Pages ou Netlify para permitir o carregamento dos templates.</p></main>`;
});
