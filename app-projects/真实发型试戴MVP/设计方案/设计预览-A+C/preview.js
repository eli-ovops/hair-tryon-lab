const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('[data-go]')];
const historyStack = ['scan'];
let current = 'scan';

function show(id, remember = true) {
  const next = document.querySelector(`[data-screen="${id}"]`);
  if (!next) return;
  screens.forEach((screen) => screen.classList.toggle('active', screen === next));
  navButtons.forEach((button) => button.classList.toggle('selected', button.dataset.go === id));
  if (remember && id !== current) historyStack.push(id);
  current = id;
  next.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  const go = event.target.closest('[data-go]');
  if (go) show(go.dataset.go);
  if (event.target.closest('[data-action="back"]')) {
    historyStack.pop();
    show(historyStack.at(-1) || 'scan', false);
  }
  if (event.target.closest('[data-action="info"]')) alert('设计预览：不调用摄像头，不上传照片。');
  if (event.target.closest('[data-action="share"]')) alert('设计预览：这里将打开保存或分享。');
  const look = event.target.closest('.look');
  if (look) {
    document.querySelectorAll('.look').forEach((item) => {
      const selected = item === look;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    const name = look.dataset.look;
    document.querySelector('[data-style-name]').textContent = name;
    document.querySelector('[data-try-name]').textContent = name;
    document.querySelector('[data-card-name]').textContent = name;
    document.querySelector('[data-hero-image]').src = look.dataset.image;
    document.querySelector('[data-try-image]').src = look.dataset.image;
    document.querySelector('[data-hero-image]').alt = `${name} 发型示例`;
    document.querySelector('[data-try-image]').alt = `${name} 试戴示例`;
  }
  const tab = event.target.closest('[role="tab"]');
  if (tab) document.querySelectorAll('[role="tab"]').forEach((item) => {
    const selected = item === tab;
    item.classList.toggle('selected', selected);
    item.setAttribute('aria-selected', String(selected));
  });
});

document.querySelectorAll('img').forEach((image) => image.addEventListener('error', () => image.classList.add('asset-missing')));
