const countryOptions = [
  { name: 'USA (2x2 inches)', widthMm: 50.8, heightMm: 50.8 },
  { name: 'UK (35x45mm)', widthMm: 35, heightMm: 45 },
  { name: 'Canada (50x70mm)', widthMm: 50, heightMm: 70 },
  { name: 'India (35x45mm)', widthMm: 35, heightMm: 45 },
  { name: 'Uganda (45x45mm)', widthMm: 45, heightMm: 45 },
  { name: 'Kenya (45x45mm)', widthMm: 45, heightMm: 45 },
  { name: 'Nigeria (35x45mm)', widthMm: 35, heightMm: 45 },
  { name: 'Australia (35x45mm)', widthMm: 35, heightMm: 45 },
  { name: 'China (33x48mm)', widthMm: 33, heightMm: 48 }
];

const elements = {
  fileInput: document.getElementById('fileInput'),
  countrySelect: document.getElementById('countrySelect'),
  zoomRange: document.getElementById('zoomRange'),
  editorCanvas: document.getElementById('editorCanvas'),
  previewCanvas: document.getElementById('previewCanvas'),
  downloadPdfBtn: document.getElementById('downloadPdfBtn'),
  saveBtn: document.getElementById('saveBtn'),
  sizeLabel: document.getElementById('sizeLabel'),
  message: document.getElementById('message'),
  authStatus: document.getElementById('authStatus'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  signupBtn: document.getElementById('signupBtn'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  savedList: document.getElementById('savedList')
};

const editorCtx = elements.editorCanvas.getContext('2d');
const previewCtx = elements.previewCanvas.getContext('2d');

const state = {
  image: null,
  imageX: 0,
  imageY: 0,
  baseScale: 1,
  zoom: 1,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  selected: countryOptions[0],
  currentUser: null
};

function showMessage(text, isError = false) {
  elements.message.textContent = text;
  elements.message.style.color = isError ? '#b00020' : '#1b5e20';
}

function populateCountries() {
  countryOptions.forEach((option, index) => {
    const el = document.createElement('option');
    el.value = index;
    el.textContent = option.name;
    elements.countrySelect.appendChild(el);
  });
  elements.countrySelect.value = '0';
}

function aspectRatio() {
  return state.selected.widthMm / state.selected.heightMm;
}

function updateEditorSize() {
  const max = 420;
  const ratio = aspectRatio();
  if (ratio >= 1) {
    elements.editorCanvas.width = max;
    elements.editorCanvas.height = Math.round(max / ratio);
  } else {
    elements.editorCanvas.height = max;
    elements.editorCanvas.width = Math.round(max * ratio);
  }

  if (ratio >= 1) {
    elements.previewCanvas.width = 300;
    elements.previewCanvas.height = Math.round(300 / ratio);
  } else {
    elements.previewCanvas.height = 300;
    elements.previewCanvas.width = Math.round(300 * ratio);
  }

  elements.sizeLabel.textContent = `Selected size: ${state.selected.widthMm}mm × ${state.selected.heightMm}mm (aspect ${ratio.toFixed(2)})`;
}

function centerImage() {
  if (!state.image) return;
  const scaleX = elements.editorCanvas.width / state.image.width;
  const scaleY = elements.editorCanvas.height / state.image.height;
  state.baseScale = Math.max(scaleX, scaleY);
  const scaledW = state.image.width * state.baseScale * state.zoom;
  const scaledH = state.image.height * state.baseScale * state.zoom;
  state.imageX = (elements.editorCanvas.width - scaledW) / 2;
  state.imageY = (elements.editorCanvas.height - scaledH) / 2;
}

function drawEditor() {
  editorCtx.clearRect(0, 0, elements.editorCanvas.width, elements.editorCanvas.height);
  editorCtx.fillStyle = '#f4f6ff';
  editorCtx.fillRect(0, 0, elements.editorCanvas.width, elements.editorCanvas.height);

  if (!state.image) {
    editorCtx.fillStyle = '#667';
    editorCtx.font = '16px sans-serif';
    editorCtx.fillText('Upload an image to begin', 20, 30);
    return;
  }

  const scaledW = state.image.width * state.baseScale * state.zoom;
  const scaledH = state.image.height * state.baseScale * state.zoom;
  editorCtx.drawImage(state.image, state.imageX, state.imageY, scaledW, scaledH);

  drawPreview();
}

function drawPreview() {
  previewCtx.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
  if (!state.image) {
    previewCtx.fillStyle = '#667';
    previewCtx.font = '14px sans-serif';
    previewCtx.fillText('Preview unavailable', 10, 20);
    return;
  }

  const scaledW = state.image.width * state.baseScale * state.zoom;
  const scaledH = state.image.height * state.baseScale * state.zoom;

  previewCtx.drawImage(
    state.image,
    state.imageX,
    state.imageY,
    scaledW,
    scaledH
  );
}

function getOutputCanvas() {
  const output = document.createElement('canvas');
  const dpi = 300;
  const mmToIn = 1 / 25.4;
  output.width = Math.round(state.selected.widthMm * mmToIn * dpi);
  output.height = Math.round(state.selected.heightMm * mmToIn * dpi);
  const ctx = output.getContext('2d');

  const scaledW = state.image.width * state.baseScale * state.zoom;
  const scaledH = state.image.height * state.baseScale * state.zoom;

  const sx = -state.imageX * (output.width / elements.editorCanvas.width);
  const sy = -state.imageY * (output.height / elements.editorCanvas.height);
  const sw = scaledW * (output.width / elements.editorCanvas.width);
  const sh = scaledH * (output.height / elements.editorCanvas.height);

  ctx.drawImage(state.image, sx, sy, sw, sh);
  return output;
}

async function downloadPdf() {
  if (!state.image) {
    showMessage('Please upload and crop an image first.', true);
    return;
  }

  const outputCanvas = getOutputCanvas();
  const dataUrl = outputCanvas.toDataURL('image/jpeg', 1.0);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const spacing = 2;

  const cols = Math.floor((pageW - margin * 2 + spacing) / (state.selected.widthMm + spacing));
  const rows = Math.floor((pageH - margin * 2 + spacing) / (state.selected.heightMm + spacing));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = margin + col * (state.selected.widthMm + spacing);
      const y = margin + row * (state.selected.heightMm + spacing);
      pdf.addImage(dataUrl, 'JPEG', x, y, state.selected.widthMm, state.selected.heightMm);
    }
  }

  pdf.save('passport-photos-a4.pdf');
  showMessage(`Downloaded PDF with ${cols * rows} copies.`);
}

async function saveToAccount() {
  if (!state.currentUser) {
    showMessage('Log in to save photos.', true);
    return;
  }
  if (!state.image) {
    showMessage('Upload an image before saving.', true);
    return;
  }

  const dataUrl = getOutputCanvas().toDataURL('image/png');

  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      country: state.selected.name,
      widthMm: state.selected.widthMm,
      heightMm: state.selected.heightMm,
      imageData: dataUrl
    })
  });
  const json = await res.json();
  if (!res.ok) {
    showMessage(json.error || 'Save failed', true);
    return;
  }
  showMessage('Photo saved to your account.');
  loadSavedPhotos();
}

async function authRequest(path) {
  const email = elements.email.value.trim();
  const password = elements.password.value.trim();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok) {
    showMessage(json.error || 'Authentication failed', true);
    return;
  }
  showMessage(json.message);
  await loadMe();
}

async function loadMe() {
  const res = await fetch('/api/me');
  const json = await res.json();
  state.currentUser = json.user;

  if (state.currentUser) {
    elements.authStatus.textContent = `Logged in as ${state.currentUser.email}`;
    elements.logoutBtn.classList.remove('hidden');
    elements.saveBtn.classList.remove('hidden');
    loadSavedPhotos();
  } else {
    elements.authStatus.textContent = 'Not logged in';
    elements.logoutBtn.classList.add('hidden');
    elements.saveBtn.classList.add('hidden');
    elements.savedList.textContent = 'Log in to view saved photos.';
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  showMessage('Logged out');
  loadMe();
}

async function loadSavedPhotos() {
  if (!state.currentUser) return;
  const res = await fetch('/api/saved');
  const json = await res.json();
  if (!res.ok) {
    elements.savedList.textContent = 'Could not load saved photos.';
    return;
  }

  elements.savedList.innerHTML = '';
  if (!json.items.length) {
    elements.savedList.textContent = 'No saved photos yet.';
    return;
  }

  json.items.forEach((item) => {
    const block = document.createElement('div');
    block.className = 'saved-item';
    block.innerHTML = `
      <div><strong>${item.country}</strong></div>
      <div>${item.width_mm}mm × ${item.height_mm}mm</div>
      <div>${new Date(item.created_at).toLocaleString()}</div>
      <img src="${item.image_data}" alt="Saved passport photo" />
    `;
    elements.savedList.appendChild(block);
  });
}

function bindCanvasDrag() {
  const start = (x, y) => {
    if (!state.image) return;
    state.dragging = true;
    state.dragStartX = x;
    state.dragStartY = y;
  };

  const move = (x, y) => {
    if (!state.dragging || !state.image) return;
    const dx = x - state.dragStartX;
    const dy = y - state.dragStartY;
    state.dragStartX = x;
    state.dragStartY = y;
    state.imageX += dx;
    state.imageY += dy;
    drawEditor();
  };

  elements.editorCanvas.addEventListener('mousedown', (e) => start(e.offsetX, e.offsetY));
  elements.editorCanvas.addEventListener('mousemove', (e) => move(e.offsetX, e.offsetY));
  window.addEventListener('mouseup', () => {
    state.dragging = false;
  });

  elements.editorCanvas.addEventListener('touchstart', (e) => {
    const rect = elements.editorCanvas.getBoundingClientRect();
    const t = e.touches[0];
    start(t.clientX - rect.left, t.clientY - rect.top);
    e.preventDefault();
  });

  elements.editorCanvas.addEventListener('touchmove', (e) => {
    if (!state.dragging) return;
    const rect = elements.editorCanvas.getBoundingClientRect();
    const t = e.touches[0];
    move(t.clientX - rect.left, t.clientY - rect.top);
    e.preventDefault();
  });

  window.addEventListener('touchend', () => {
    state.dragging = false;
  });
}

function bindEvents() {
  elements.countrySelect.addEventListener('change', (e) => {
    state.selected = countryOptions[Number(e.target.value)];
    updateEditorSize();
    if (state.image) centerImage();
    drawEditor();
  });

  elements.zoomRange.addEventListener('input', (e) => {
    state.zoom = Number(e.target.value);
    if (state.image) centerImage();
    drawEditor();
  });

  elements.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showMessage('Only JPG and PNG files are supported.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        centerImage();
        drawEditor();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  elements.downloadPdfBtn.addEventListener('click', downloadPdf);
  elements.saveBtn.addEventListener('click', saveToAccount);
  elements.signupBtn.addEventListener('click', () => authRequest('/api/signup'));
  elements.loginBtn.addEventListener('click', () => authRequest('/api/login'));
  elements.logoutBtn.addEventListener('click', logout);
}

populateCountries();
updateEditorSize();
bindCanvasDrag();
bindEvents();
drawEditor();
loadMe();
