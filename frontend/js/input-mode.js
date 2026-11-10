// Remembers whether the last input was the keyboard, so focus can go to a control (with a visible ring) for keyboard
// users and to the container (no ring) after a touch or mouse.
let keyboard = false;
document.addEventListener('keydown', () => { keyboard = true; }, true);
document.addEventListener('pointerdown', () => { keyboard = false; }, true);
export const usedKeyboard = () => keyboard;
