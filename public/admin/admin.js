// ZLog Admin Script
var storedPassword = '';

// ── Toast ──
function toast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = type;
  setTimeout(function () { el.className = ''; }, 3000);
}

// ── Login ──
document.getElementById('login-btn').addEventListener('click', function () {
  var pw = document.getElementById('password-input').value;
  storedPassword = pw;
  fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw, title: '__ping__', content: '__ping__', source: 'editor' }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error === '密码错误') {
        document.getElementById('login-error').textContent = '密码错误';
      } else {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-screen').style.display = 'block';
        document.getElementById('edate').value = new Date().toISOString().split('T')[0];
      }
    })
    .catch(function () {
      // API unreachable (local dev without setup) — let them in
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-screen').style.display = 'block';
      document.getElementById('edate').value = new Date().toISOString().split('T')[0];
    });
});

document.getElementById('password-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

// ── Tab switching ──
var tabBtns = document.querySelectorAll('.tabs button');
for (var i = 0; i < tabBtns.length; i++) {
  tabBtns[i].addEventListener('click', function () {
    for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active');
    var contents = document.querySelectorAll('.tab-content');
    for (var k = 0; k < contents.length; k++) contents[k].classList.remove('active');
    this.classList.add('active');
    document.getElementById(this.getAttribute('data-tab')).classList.add('active');
  });
}

// ── Live preview ──
var mdTextarea = document.getElementById('emd');
var editorPreview = document.getElementById('editor-preview');
var previewTimer;

mdTextarea.addEventListener('input', function () {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(function () {
    editorPreview.innerHTML = marked.parse(mdTextarea.value || '*(预览将在这里显示)*');
  }, 300);
});
editorPreview.innerHTML = marked.parse('*(预览将在这里显示)*');

// ── Editor publish ──
document.getElementById('editor-publish').addEventListener('click', function () {
  var btn = this;
  var title = document.getElementById('etitle').value.trim();
  var content = document.getElementById('emd').value.trim();
  if (!title || !content) { toast('标题和正文不能为空', 'error'); return; }

  btn.disabled = true; btn.textContent = '⏳ 发布中...';
  fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: storedPassword,
      title: title,
      description: document.getElementById('edesc').value.trim(),
      tags: document.getElementById('etags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      content: content,
      source: 'editor',
      date: document.getElementById('edate').value,
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        toast('✅ 发布成功！Vercel 1-2 分钟后生效', 'success');
        document.getElementById('etitle').value = '';
        document.getElementById('edesc').value = '';
        document.getElementById('etags').value = '';
        mdTextarea.value = '';
        editorPreview.innerHTML = marked.parse('*(预览将在这里显示)*');
      } else {
        toast('❌ ' + (data.error || '未知错误'), 'error');
      }
    })
    .catch(function (e) {
      toast('❌ 网络错误: ' + e.message, 'error');
    })
    .then(function () {
      btn.disabled = false; btn.textContent = '📤 发布文章';
    });
});

// ── File upload ──
var uploadContent = '';
var uploadSlug = '';
var dropzone = document.getElementById('dropzone');
var fileInput = document.getElementById('file-input');

dropzone.addEventListener('click', function () { fileInput.click(); });
dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('dragover'); });
dropzone.addEventListener('drop', function (e) {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', function () {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file || !file.name.endsWith('.md')) { toast('请选择 .md 文件', 'error'); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    uploadContent = e.target.result;
    uploadSlug = file.name.replace(/\.md$/, '');
    document.getElementById('file-info').style.display = 'block';
    document.getElementById('file-info').textContent = '📄 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    document.getElementById('upload-preview').style.display = 'block';
    document.getElementById('upload-preview').innerHTML = marked.parse(uploadContent);
    document.getElementById('upload-publish').style.display = 'inline-flex';
  };
  reader.readAsText(file);
}

// ── Upload publish ──
document.getElementById('upload-publish').addEventListener('click', function () {
  var btn = this;
  btn.disabled = true; btn.textContent = '⏳ 发布中...';

  var title = uploadSlug;
  var fmMatch = uploadContent.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    var titleMatch = fmMatch[1].match(/title:\s*["']?([^"'\n]+)["']?/);
    if (titleMatch) title = titleMatch[1];
  }

  fetch('/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: storedPassword,
      title: title,
      description: '',
      tags: [],
      content: uploadContent,
      source: 'upload',
      date: new Date().toISOString().split('T')[0],
    }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        toast('✅ 上传成功！Vercel 1-2 分钟后生效', 'success');
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('upload-preview').style.display = 'none';
        document.getElementById('upload-preview').innerHTML = '';
        document.getElementById('upload-publish').style.display = 'none';
        uploadContent = '';
      } else {
        toast('❌ ' + (data.error || '未知错误'), 'error');
      }
    })
    .catch(function (e) {
      toast('❌ 网络错误: ' + e.message, 'error');
    })
    .then(function () {
      btn.disabled = false; btn.textContent = '📤 上传并发布';
    });
});
