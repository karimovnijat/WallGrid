(function () {
  const dictionaries = {};
  const bindings = [];
  let language = 'en';
  const I = {
    t(key, values = []) {
      const text = dictionaries[language]?.[key] ?? dictionaries.en?.[key] ?? key;
      return text.replace(/\{(\d+)\}/g, (match, i) => values[i] ?? match);
    },
    async load() {
      await Promise.all(['az', 'en', 'ru'].map(async code => {
        const response = await fetch(`lang/${code}.json`);
        if (!response.ok) throw new Error(`Language file: ${code}`);
        dictionaries[code] = await response.json();
      }));
    },
    bind(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.parentElement.closest('script,style,textarea')) continue;
        const key = node.textContent.trim();
        if (Object.hasOwn(dictionaries.en, key)) {
          const target = node;
          const before = node.textContent.match(/^\s*/)[0];
          const after = node.textContent.match(/\s*$/)[0];
          bindings.push(() => { target.textContent = before + I.t(key) + after; });
        }
      }
      for (const el of [root, ...root.querySelectorAll('*')]) {
        for (const attr of ['title', 'aria-label', 'placeholder']) {
          const key = el.getAttribute?.(attr);
          if (key && Object.hasOwn(dictionaries.en, key)) bindings.push(() => el.setAttribute(attr, I.t(key)));
        }
      }
      I.apply();
    },
    apply() { bindings.forEach(update => update()); },
    set(code) {
      language = ['az', 'en', 'ru'].includes(code) ? code : 'en';
      document.documentElement.lang = language;
      // CSS-only labels (e.g. the drop-target badge) read their text from a custom property
      document.documentElement.style.setProperty('--drop-label', JSON.stringify(I.t('⇄ swap places')));
      I.apply();
    }
  };
  window.WM = window.WM || {};
  window.WM.i18n = I;
})();
