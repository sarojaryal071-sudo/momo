// Runs before the page paints, so script-only layout (the phone menu) does not flash. Without scripts the class is absent.
document.documentElement.classList.add('js');
