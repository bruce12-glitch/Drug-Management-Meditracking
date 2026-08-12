function applyLanguage(lang) {
  document.querySelectorAll('[data-i18n-key]').forEach(element => {
    const key = element.getAttribute('data-i18n-key');
    if (translations && translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    } else if (translations && translations['en'] && translations['en'][key]) {
      element.textContent = translations['en'][key];
    }
  });
}
window.applyLanguage = applyLanguage;