// Modal functionality
const profileBtn = document.getElementById('profile-btn');
const notificationsBtn = document.getElementById('notifications-btn');
const profileModal = document.getElementById('profile-modal');
const closeModal = document.querySelector('.close');

// Open profile modal
profileBtn?.addEventListener('click', () => {
    profileModal.style.display = 'block';
});

// Close modal when clicking X
closeModal?.addEventListener('click', () => {
    profileModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.style.display = 'none';
    }
});

// Like button functionality
document.querySelectorAll('.btn-action').forEach(btn => {
    btn.addEventListener('click', function() {
        const icon = this.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            this.style.color = '#0a66c2';
        } else {
            icon.classList.add('far');
            icon.classList.remove('fas');
            this.style.color = '#666';
        }
    });
});

// Post button functionality
const postBtn = document.querySelector('.compose-card .btn-primary');
const textarea = document.querySelector('.compose-card textarea');

postBtn?.addEventListener('click', () => {
    if (textarea.value.trim()) {
        alert('Post created successfully!');
        textarea.value = '';
    } else {
        alert('Please write something before posting.');
    }
});

// Connect button functionality
document.querySelectorAll('.btn-small').forEach(btn => {
    btn.addEventListener('click', function() {
        this.textContent = 'Connected';
        this.style.backgroundColor = '#0a66c2';
        this.style.color = 'white';
    });
});

// Apply button functionality
document.querySelectorAll('.job-item .btn-primary').forEach(btn => {
    btn.addEventListener('click', function() {
        this.textContent = 'Applied';
        this.style.backgroundColor = '#e0e0e0';
        this.style.color = '#666';
    });
});

// Notification badge decrement
notificationsBtn?.addEventListener('click', function() {
    const badge = this.querySelector('.badge');
    const currentCount = parseInt(badge.textContent);
    if (currentCount > 0) {
        badge.textContent = currentCount - 1;
    }
});

// Auto-resize textarea
textarea?.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Smooth scroll for navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
    });
});

// Keyboard shortcut for posting (Ctrl/Cmd + Enter)
textarea?.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        postBtn?.click();
    }
});