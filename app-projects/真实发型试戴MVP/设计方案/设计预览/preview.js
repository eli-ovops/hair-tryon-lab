const screens = [...document.querySelectorAll('.screen')];
const history = ['intro'];
let current = 'intro';

function show(id, push = true) {
  const target = document.querySelector(`[data-screen="${id}"]`);
  if (!target) return;
  screens.forEach((screen) => screen.classList.toggle('active', screen === target));
  if (push && id !== current) history.push(id);
  current = id;
  document.querySelectorAll('[data-go]').forEach((button) => button.classList.toggle('selected-nav', button.dataset.go === id));
  // Move keyboard and assistive-technology focus to the newly displayed view.
  // A heading is not focusable by default, so the screen itself carries focus.
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

document.addEventListener('click', (event) => {
  const go = event.target.closest('[data-go]');
  if (go) show(go.dataset.go);
  if (event.target.closest('[data-action="back"]')) {
    history.pop();
    show(history.at(-1) || 'intro', false);
  }
  if (event.target.closest('[data-action="info"]')) alert('这是静态/轻交互的产品设计预览，不会调用摄像头、上传图片或生成真实发型。');
  const style = event.target.closest('.style-card');
  if (style) document.querySelectorAll('.style-card').forEach((item) => item.classList.toggle('selected', item === style));
  const segment = event.target.closest('.segmented button');
  if (segment) document.querySelectorAll('.segmented button').forEach((item) => item.classList.toggle('active', item === segment));
});
