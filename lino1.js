// DOM Elements
const termsLink = document.getElementById('terms-link');
const termsModal = document.getElementById('terms-modal');
const termsCloseBtn = document.getElementById('terms-close-btn');
const termsCheckbox = document.getElementById('terms-accept');
const modalAcceptBtn = document.getElementById('modal-accept-btn');
const automaticMode = document.getElementById('automatic-mode');
const pagewiseMode = document.getElementById('pagewise-mode');
const textArea = document.getElementById('text-area');
const textareaElement = document.querySelector('.assignment-textarea');
const wordCountElement = document.getElementById('word-count');
const pageCountElement = document.getElementById('page-count');
const submitBtn = document.getElementById('submit-btn');
const digitalToggle = document.getElementById('digitalToggle');
const physicalToggle = document.getElementById('physicalToggle');
const physicalMsg = document.getElementById('physical-msg');

// App State
let physicalDeliveryStatus = 'checking'; // 'checking', 'jaipur', 'outside', 'denied'
let locationWarningShown = false;

// ---------- Terms Modal ----------
termsLink.addEventListener('click', () => {
    termsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});
termsCloseBtn.addEventListener('click', () => {
    termsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
});
modalAcceptBtn.addEventListener('click', () => {
    termsCheckbox.checked = true;
    termsModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    updateSubmitButton();
});
window.addEventListener('click', e => {
    if (e.target === termsModal) {
        termsModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && termsModal.classList.contains('active')) {
        termsModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// ---------- Writing Mode ----------
automaticMode.addEventListener('click', () => {
    automaticMode.classList.add('active');
    pagewiseMode.classList.remove('active');
    textArea.classList.add('active');
});
pagewiseMode.addEventListener('click', () => {
    pagewiseMode.classList.add('active');
    automaticMode.classList.remove('active');
    textArea.classList.remove('active');

    // Send mode to backend
    fetch('/save-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ writing_mode: 'pagewise' })
    }).then(res => {
        if (res.redirected) {
            window.location.href = res.url;
        }
    });
});

// ---------- Word/Page Count ----------
textareaElement.addEventListener('input', () => {
    const words = textareaElement.value.trim().split(/\s+/).filter(Boolean).length;
    const pages = Math.ceil(words / 300);
    wordCountElement.textContent = words;
    pageCountElement.textContent = pages;
    updateSubmitButton();
});

// ---------- Toggle Labels ----------
function updateToggleLabels(toggle) {
    const labels = toggle?.parentElement?.querySelector('.toggle-labels');
    if (!labels) return;
    const onLabel = labels.querySelector('.on');
    const offLabel = labels.querySelector('.off');
    if (onLabel && offLabel) {
        onLabel.style.opacity = toggle.checked ? '1' : '0';
        offLabel.style.opacity = toggle.checked ? '0' : '1';
    }
}

// Initialize toggles
[digitalToggle, physicalToggle].forEach(toggle => {
    if (toggle) {
        updateToggleLabels(toggle);
        toggle.addEventListener('change', () => {
            updateToggleLabels(toggle);
            if (toggle === digitalToggle) saveDigitalPreference();
            if (toggle === physicalToggle) savePhysicalPreference();
        });
    }
});

// ---------- Restrict Physical Toggle ----------
physicalToggle.addEventListener('change', () => {
    if (physicalDeliveryStatus === 'outside' || physicalDeliveryStatus === 'denied') {
        physicalToggle.checked = false;
        updateToggleLabels(physicalToggle);
    } else {
        savePhysicalPreference();
    }
});

// ---------- Location Logic ----------
function setPhysicalMessage() {
    switch (physicalDeliveryStatus) {
        case 'checking':
            physicalMsg.innerHTML = '📍 Checking your location…';
            physicalMsg.style.display = 'flex';
            break;
        case 'jaipur':
            physicalMsg.style.display = 'none';
            break;
        case 'outside':
            physicalMsg.innerHTML = '⚠️ Physical delivery is currently limited to Jaipur. We’ll soon expand to your area.';
            physicalMsg.style.display = 'flex';
            physicalToggle.checked = false;
            updateToggleLabels(physicalToggle);
            break;
        case 'denied':
            physicalMsg.innerHTML = '🚫 Please allow location access to continue using this service.';
            physicalMsg.style.display = 'flex';
            physicalToggle.checked = false;
            updateToggleLabels(physicalToggle);
            if (!locationWarningShown) {
                alert('⚠️ Please allow location access to enable physical delivery options.');
                locationWarningShown = true;
            }
            break;
    }
    updateSubmitButton();
}

function getLocationAndCheckCity() {
    if (!navigator.geolocation) {
        physicalDeliveryStatus = 'denied';
        setPhysicalMessage();
        return;
    }

    navigator.geolocation.getCurrentPosition(async position => {
        const { latitude: lat, longitude: lon } = position.coords;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            const city = (data.address.city || data.address.town || data.address.village || '').toLowerCase();
            physicalDeliveryStatus = city.includes('jaipur') ? 'jaipur' : 'outside';
        } catch (err) {
            physicalDeliveryStatus = 'outside';
        }
        setPhysicalMessage();
    }, () => {
        physicalDeliveryStatus = 'denied';
        setPhysicalMessage();
        setTimeout(getLocationAndCheckCity, 6000); // Retry
    });
}

getLocationAndCheckCity(); // Auto check on page load

// ---------- Submit Button ----------
function updateSubmitButton() {
    const hasText = textareaElement.value.trim().length > 0;
    const termsAccepted = termsCheckbox.checked;
    const locationReady = physicalDeliveryStatus !== 'checking';
    submitBtn.disabled = !(hasText && termsAccepted && locationReady);
}

// ---------- Submit Action ----------
submitBtn.addEventListener('click', () => {
    if (!termsCheckbox.checked) return alert('Please accept the terms.');
    if (!textareaElement.value.trim().length) return alert('Please enter your assignment.');
    if (physicalDeliveryStatus === 'denied') return alert('Please enable location to proceed.');

    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    setTimeout(() => {
        alert('✅ Assignment submitted! Our robotic writer is on it.');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment';
        submitBtn.disabled = false;
    }, 2000);
});

// ---------- Save Toggles to Backend ----------
function saveDigitalPreference() {
    const isChecked = digitalToggle.checked;
    const formData = new FormData();
    if (isChecked) formData.append('digital_copy', 'on');

    fetch('/save-digital', {
        method: 'POST',
        body: formData
    });
}

function savePhysicalPreference() {
    const isChecked = physicalToggle.checked;
    const formData = new FormData();
    if (isChecked) formData.append('physical_copy', 'on');

    fetch('/save-physical', {
        method: 'POST',
        body: formData
    });
}

// ---------- Init ----------
automaticMode.classList.add('active');
textArea.classList.add('active');
