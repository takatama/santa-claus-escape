function codeValue(getCode) {
  return String(getCode?.() ?? '0000').replace(/\D/g, '').slice(0, 4).padStart(4, '0');
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

const wrapDigit = value => (value % 10 + 10) % 10;
const MOTION_DURATION = 150;

/** A number strip moves in the direction of the finger or the indicated arrow. */
export function createCylinderLock({ getCode, setCode, onChange = () => {} }) {
  const element = node('div', 'rb-cylinder-lock');
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', '四桁のダイアル錠');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cylinders = [];
  let disabled = false;

  function rowHeight(state) {
    const measured = state.rows[2].getBoundingClientRect().height;
    const configured = parseFloat(getComputedStyle(state.viewport).getPropertyValue('--rb-cylinder-row-height'));
    return measured || configured || 44;
  }

  function paintRows(state, value = state.value) {
    state.displayValue = value;
    state.cylinder.dataset.displayValue = String(value);
    state.rows.forEach((row, index) => { row.textContent = String(wrapDigit(value + index - 2)); });
  }

  function setOffset(state, offset) {
    state.offset = offset;
    state.strip.style.setProperty('--rb-cylinder-offset', `${offset}px`);
    state.strip.style.transform = `translate3d(0, calc(-1 * var(--rb-cylinder-row-height, 44px) + ${offset}px), 0)`;
    state.cylinder.dataset.offset = offset.toFixed(2);
  }

  function stopMotion(state) {
    if (state.motion) cancelAnimationFrame(state.motion.frame);
    state.motion = null;
    delete state.cylinder.dataset.rotating;
  }

  function settle(state) {
    stopMotion(state);
    paintRows(state);
    setOffset(state, 0);
  }

  function cancelState(state) {
    state.version++;
    const drag = state.drag;
    state.drag = null;
    delete state.cylinder.dataset.dragging;
    if (drag) {
      state.ignoreClickUntil = performance.now() + 400;
      if (drag.capture.hasPointerCapture?.(drag.id)) drag.capture.releasePointerCapture(drag.id);
    }
    settle(state);
  }

  function animateToCenter(state, fromOffset, displayValue, direction) {
    stopMotion(state);
    if (reducedMotion.matches || disabled || !fromOffset) { settle(state); return; }
    paintRows(state, displayValue);
    setOffset(state, fromOffset);
    state.cylinder.dataset.rotating = direction;
    const motion = { frame: 0, start: performance.now() };
    state.motion = motion;
    function frame(now) {
      if (state.motion !== motion) return;
      const progress = Math.min(1, Math.max(0, (now - motion.start) / MOTION_DURATION));
      const eased = 1 - (1 - progress) ** 3;
      setOffset(state, fromOffset * (1 - eased));
      if (progress < 1) motion.frame = requestAnimationFrame(frame);
      else { state.motion = null; delete state.cylinder.dataset.rotating; paintRows(state); setOffset(state, 0); }
    }
    motion.frame = requestAnimationFrame(frame);
  }

  function writeDigit(state, nextValue) {
    const before = codeValue(getCode);
    const digits = before.split('');
    digits[state.index] = String(wrapDigit(nextValue));
    const next = digits.join('');
    // Set the expected value before setCode: its callback can synchronously refresh this lock.
    state.value = Number(digits[state.index]);
    setCode(next);
    refresh();
    if (codeValue(getCode) !== before) onChange();
    return codeValue(getCode) !== before;
  }

  function step(state, delta) {
    if (disabled || state.drag) return;
    settle(state);
    const before = Number(codeValue(getCode)[state.index]);
    const version = state.version;
    if (!writeDigit(state, before + delta) || disabled || state.version !== version) return;
    // Around the new value, +one row has exactly the old value in the center.
    // Moving that offset to zero therefore carries the actual strip upward for +1.
    animateToCenter(state, delta * rowHeight(state), state.value, delta > 0 ? 'up' : 'down');
  }

  for (let index = 0; index < 4; index++) {
    const cylinder = node('div', 'rb-cylinder');
    cylinder.dataset.cylinder = String(index);
    const viewport = node('div', 'rb-cylinder-viewport');
    const strip = node('div', 'rb-cylinder-strip');
    strip.setAttribute('aria-hidden', 'true');
    const rows = Array.from({ length: 5 }, (_, rowIndex) => {
      const row = node('span', 'rb-cylinder-number');
      row.dataset.offset = String(rowIndex - 2);
      strip.append(row);
      return row;
    });
    const previous = node('button', 'rb-cylinder-adjacent rb-cylinder-previous rb-cylinder-control');
    const current = node('button', 'rb-cylinder-current rb-cylinder-control');
    const next = node('button', 'rb-cylinder-adjacent rb-cylinder-next rb-cylinder-control');
    for (const button of [previous, current, next]) button.type = 'button';
    for (const [button, direction] of [[previous, '↑'], [next, '↓']]) {
      const arrow = node('span', 'rb-cylinder-direction', direction);
      arrow.setAttribute('aria-hidden', 'true');
      button.append(arrow);
      button.tabIndex = -1;
    }
    previous.setAttribute('aria-label', `${index + 1}桁目の数字の列を上へ回す`);
    next.setAttribute('aria-label', `${index + 1}桁目の数字の列を下へ回す`);
    current.setAttribute('role', 'spinbutton');
    current.setAttribute('aria-label', `${index + 1}桁目のダイアル`);
    current.setAttribute('aria-valuemin', '0');
    current.setAttribute('aria-valuemax', '9');
    current.setAttribute('aria-valuenow', '0');
    current.title = '上下のキーで列を回す。数字キーで直接入力する。左右のキーで桁を移る。';
    viewport.append(strip, previous, current, next);
    cylinder.append(viewport);
    element.append(cylinder);
    const state = { index, cylinder, viewport, strip, rows, previous, current, next,
      value: 0, displayValue: 0, offset: 0, motion: null, drag: null, ignoreClickUntil: 0, version: 0 };
    cylinders.push(state);

    previous.addEventListener('click', () => { current.focus({ preventScroll: true }); step(state, 1); });
    next.addEventListener('click', () => { current.focus({ preventScroll: true }); step(state, -1); });
    current.addEventListener('click', () => current.focus({ preventScroll: true }));
    cylinder.addEventListener('keydown', event => {
      if (disabled) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        step(state, event.key === 'ArrowUp' ? 1 : -1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cylinders[(index + (event.key === 'ArrowRight' ? 1 : 3)) % 4].current.focus({ preventScroll: true });
      } else if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        cancelState(state);
        writeDigit(state, Number(event.key));
        settle(state);
      }
    });

    cylinder.addEventListener('pointerdown', event => {
      if (disabled || event.button !== 0 || event.isPrimary === false || state.drag) return;
      settle(state);
      const capture = event.target instanceof Element ? event.target : cylinder;
      state.drag = { id: event.pointerId, startY: event.clientY, originY: event.clientY,
        moved: false, height: rowHeight(state), capture };
      capture.setPointerCapture?.(event.pointerId);
    });
    cylinder.addEventListener('pointermove', event => {
      const drag = state.drag;
      if (!drag || event.pointerId !== drag.id || disabled) return;
      if (Math.abs(event.clientY - drag.startY) > 6) {
        drag.moved = true;
        cylinder.dataset.dragging = 'true';
      }
      if (drag.moved) event.preventDefault();
      const distance = event.clientY - drag.originY;
      const steps = Math.trunc(distance / drag.height);
      if (steps) {
        const before = Number(codeValue(getCode)[index]);
        writeDigit(state, before - steps);
        if (state.drag !== drag || disabled) return;
        drag.originY += steps * drag.height;
        paintRows(state);
      }
      // After a row commits, rebase the same strip by that row. Its pixels stay
      // under the finger, including when the finger reverses before the next commit.
      setOffset(state, event.clientY - drag.originY);
    });
    function endDrag(event) {
      const drag = state.drag;
      if (!drag || event.pointerId !== drag.id) return;
      if (event.type === 'pointercancel') { cancelState(state); return; }
      state.drag = null;
      delete cylinder.dataset.dragging;
      if (drag.moved) state.ignoreClickUntil = performance.now() + 400;
      if (drag.capture.hasPointerCapture?.(drag.id)) drag.capture.releasePointerCapture(drag.id);
      if (drag.moved) animateToCenter(state, state.offset, state.value, state.offset < 0 ? 'down' : 'up');
      else settle(state);
    }
    cylinder.addEventListener('pointerup', endDrag);
    cylinder.addEventListener('pointercancel', endDrag);
    cylinder.addEventListener('lostpointercapture', event => {
      if (state.drag?.id === event.pointerId) cancelState(state);
    });
    cylinder.addEventListener('click', event => {
      if (performance.now() < state.ignoreClickUntil && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function refresh() {
    const code = codeValue(getCode);
    element.dataset.code = code;
    cylinders.forEach(state => {
      const value = Number(code[state.index]);
      if (value !== state.value) { cancelState(state); state.value = value; paintRows(state); setOffset(state, 0); }
      state.cylinder.dataset.value = String(value);
      state.current.setAttribute('aria-valuenow', String(value));
      for (const button of [state.previous, state.current, state.next]) button.disabled = disabled;
    });
  }

  function cancelInteractions() { for (const state of cylinders) cancelState(state); refresh(); }
  function setDisabled(value) {
    disabled = Boolean(value);
    if (disabled) for (const state of cylinders) cancelState(state);
    refresh();
  }
  reducedMotion.addEventListener?.('change', event => {
    if (event.matches) for (const state of cylinders) if (state.motion) settle(state);
  });
  refresh();
  for (const state of cylinders) { paintRows(state); setOffset(state, 0); }
  return { element, refresh, setDisabled, cancelInteractions };
}
