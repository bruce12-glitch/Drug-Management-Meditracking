// ============================================================
// MediTracker client helpers
// - Applies theme/accent/lang from settings injected by JSP
// - Browser notification reminders (ported from medi-tracker)
// ============================================================

(function () {
  var settings = window.TRACKER_SETTINGS || {};

  function applyAppearance() {
    if (settings.theme === 'dark' || localStorage.getItem('mode') === 'dark') {
      document.body.classList.add('dark-mode');
    }
    var accent = settings.accentColor || 'blue';
    var code = '#007bff';
    if (accent === 'green') code = '#198754';
    if (accent === 'purple') code = '#6f42c1';
    document.body.style.setProperty('--accent-color', code);

    if (window.applyLanguage) {
      applyLanguage(settings.language || 'en');
    }
  }

  applyAppearance();

  window.addEventListener('storage', function (event) {
    if (event.key === 'mode') {
      document.body.classList.toggle('dark-mode', event.newValue === 'dark');
    }
  });

  // --- Notifications ---
  function setupNotifications() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(function (permission) {
      if (permission === 'granted') {
        setInterval(checkReminders, 60000);
        checkReminders();
      }
    });
  }

  function checkReminders() {
    var meds = window.TRACKER_MEDICINES || [];
    if (!meds.length) return;

    var now = new Date();
    var currentMinutes = now.getHours() * 60 + now.getMinutes();
    var dndStart = toMinutes(settings.dndStart || '22:00');
    var dndEnd = toMinutes(settings.dndEnd || '08:00');

    if (dndStart > dndEnd) {
      if (currentMinutes >= dndStart || currentMinutes < dndEnd) return;
    } else {
      if (currentMinutes >= dndStart && currentMinutes < dndEnd) return;
    }

    var log = JSON.parse(localStorage.getItem('notification_log') || '{}');
    var remindBefore = parseInt(settings.remindBefore || '10', 10);
    var repeat = settings.repeatReminder === true || settings.repeatReminder === 'true';

    meds.forEach(function (med) {
      if (med.taken) return; // already marked today

      var parts = (med.reminderTime || '08:00').split(':');
      var medTime = new Date();
      medTime.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      var notifTime = new Date(medTime.getTime() - remindBefore * 60000);
      var logKey = med.medid + '-' + localDateKey(now);

      if (notifTime.getHours() === now.getHours() && notifTime.getMinutes() === now.getMinutes()) {
        if (!log[logKey]) {
          showNotification(med.medicineName);
          log[logKey] = { lastSent: now.getTime() };
        }
      } else if (repeat && log[logKey]) {
        var elapsed = now.getTime() - log[logKey].lastSent;
        if (elapsed >= 15 * 60 * 1000) {
          showNotification(med.medicineName);
          log[logKey].lastSent = now.getTime();
        }
      }
    });

    localStorage.setItem('notification_log', JSON.stringify(log));
  }

  function toMinutes(value) {
    var parts = String(value || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function localDateKey(date) {
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + month + '-' + day;
  }

  function showNotification(name) {
    new Notification('Time for your medicine!', {
      body: "It's time to take your " + name + ".",
      icon: 'https://img.icons8.com/color/48/000000/pill.png',
      silent: !(settings.vibration === true || settings.vibration === 'true')
    });
    if ((settings.vibration === true || settings.vibration === 'true') && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  if (window.TRACKER_ENABLE_NOTIFICATIONS) {
    setupNotifications();
  }
})();
