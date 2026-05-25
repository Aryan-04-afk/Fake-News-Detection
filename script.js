// API Base URL
var API_URL = 'http://localhost:3000/api';

// Helper: show error message
function showError(id, message) {
    var el = document.getElementById(id);
    el.textContent = message;
    el.style.display = 'block';
}

// Helper: clear all error messages
function clearErrors() {
    var errors = document.querySelectorAll('.error-msg');
    errors.forEach(function(el) {
        el.style.display = 'none';
        el.textContent = '';
    });
}

// Helper: escape HTML
function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Helper: build highlighted text with marked phrases
function buildHighlightedText(originalText, highlights) {
    if (!highlights || highlights.length === 0) return '';
    var html = '';
    var lastEnd = 0;

    // Sort by start position
    highlights.sort(function(a, b) { return a.start - b.start; });

    for (var i = 0; i < highlights.length; i++) {
        var h = highlights[i];
        // Add text before highlight
        html += escapeHtml(originalText.substring(lastEnd, h.start));
        // Add highlighted phrase
        html += '<mark class="flagged-phrase">' +
            escapeHtml(originalText.substring(h.start, h.end)) + '</mark>';
        lastEnd = h.end;
    }
    // Add remaining text
    html += escapeHtml(originalText.substring(lastEnd));
    return html;
}

// Registration
var registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        clearErrors();

        var name = document.getElementById('name').value.trim();
        var email = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;
        var confirmPassword = document.getElementById('confirmPassword').value;
        var valid = true;

        if (!name) {
            showError('nameError', 'Name is required');
            valid = false;
        } else if (name.length < 2) {
            showError('nameError', 'Name must be at least 2 characters');
            valid = false;
        } else if (!/^[A-Za-z\s]+$/.test(name)) {
            showError('nameError', 'Name can only contain letters and spaces');
            valid = false;
        }

        if (!email) {
            showError('emailError', 'Email is required');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('emailError', 'Please enter a valid email address');
            valid = false;
        }

        if (!password) {
            showError('passwordError', 'Password is required');
            valid = false;
        } else if (password.length < 6) {
            showError('passwordError', 'Password must be at least 6 characters');
            valid = false;
        }

        if (password && password !== confirmPassword) {
            showError('confirmError', 'Passwords do not match');
            valid = false;
        }

        if (valid) {
            var regBtn = registerForm.querySelector('button[type="submit"]');
            regBtn.disabled = true;
            regBtn.textContent = 'Registering...';

            fetch(API_URL + '/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, email: email, password: password })
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.success) {
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    showError('emailError', data.message);
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                showError('emailError', 'Network error. Please try again.');
            })
            .finally(function() {
                regBtn.disabled = false;
                regBtn.textContent = 'Register';
            });
        }
    });
}

// Login
var loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        clearErrors();

        var email = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;
        var valid = true;

        if (!email) {
            showError('emailError', 'Email is required');
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('emailError', 'Please enter a valid email address');
            valid = false;
        }

        if (!password) {
            showError('passwordError', 'Password is required');
            valid = false;
        }

        if (valid) {
            var loginBtn = loginForm.querySelector('button[type="submit"]');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';

            fetch(API_URL + '/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.success) {
                    localStorage.setItem('loggedInUser', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                } else {
                    showError('passwordError', data.message);
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                showError('passwordError', 'Network error. Please try again.');
            })
            .finally(function() {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            });
        }
    });
}

// Sidebar toggle
var sidebar = document.getElementById('sidebar');
var sidebarOpen = document.getElementById('sidebarOpen');
var sidebarClose = document.getElementById('sidebarClose');
var sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
}

if (sidebarOpen) sidebarOpen.addEventListener('click', openSidebar);
if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Home page
var logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    var user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!user) {
        window.location.href = 'login.html';
    }

    var welcomeEl = document.getElementById('welcomeUser');
    if (welcomeEl && user) {
        welcomeEl.textContent = 'Welcome, ' + user.name;
    }

    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    });

    // Load analysis history on page load
    loadHistory();
}

// Analyze button
var analyzeBtn = document.getElementById('analyzeBtn');
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', function() {
        var text = document.getElementById('newsInput').value.trim();
        var resultBox = document.getElementById('resultBox');
        var highlightedBox = document.getElementById('highlightedText');

        // Hide previous highlights
        if (highlightedBox) highlightedBox.style.display = 'none';

        if (!text) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = 'Please paste a news article or headline first.';
            resultBox.style.borderColor = '#e74c3c';
            resultBox.className = 'result-box';
            return;
        }

        // Show loading and lock button
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
        resultBox.style.display = 'block';
        resultBox.style.borderColor = '#ddd';
        resultBox.innerHTML = 'Analyzing...';
        resultBox.className = 'result-box';

        // Get user for history tracking
        var user = JSON.parse(localStorage.getItem('loggedInUser'));

        // Send to API
        fetch(API_URL + '/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Email': user ? user.email : ''
            },
            body: JSON.stringify({ text: text })
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                var result = data.result;
                var verdictClass = '';
                var barColor = '#27ae60';

                if (result.verdict === 'Appears Credible') {
                    verdictClass = 'verdict-credible';
                    barColor = '#27ae60';
                } else if (result.verdict === 'Possibly Misleading') {
                    verdictClass = 'verdict-warning';
                    barColor = '#f39c12';
                } else {
                    verdictClass = 'verdict-fake';
                    barColor = '#c0392b';
                }

                // Category badge
                var category = result.category || 'general';
                var categoryBadge = '<span class="category-badge category-' + category + '">' +
                    category.charAt(0).toUpperCase() + category.slice(1) + '</span>';

                // Confidence bar — shows credibility (true %)
                var truePercent = Math.round(100 - result.confidence);
                var confidenceBar =
                    '<div class="confidence-bar-container">' +
                        '<div class="confidence-bar-label">' +
                            '<span>Credibility</span>' +
                            '<span>' + truePercent + '% true</span>' +
                        '</div>' +
                        '<div class="confidence-bar-track">' +
                            '<div class="confidence-bar-fill" style="width:' + truePercent + '%; background-color:' + barColor + ';"></div>' +
                        '</div>' +
                    '</div>';

                // Build result
                resultBox.innerHTML =
                    '<div class="result-verdict ' + verdictClass + '">' +
                        '<span class="verdict-text">' + result.verdict + '</span>' +
                        categoryBadge +
                    '</div>' +
                    confidenceBar +
                    '<div class="result-reasons">' +
                        '<strong>Analysis:</strong>' +
                        '<ul>' +
                            result.reasons.map(function(r) { return '<li>' + escapeHtml(r) + '</li>'; }).join('') +
                        '</ul>' +
                    '</div>';

                resultBox.className = 'result-box ' + verdictClass + '-box';

                // Show highlighted text
                if (highlightedBox && result.highlights && result.highlights.length > 0) {
                    highlightedBox.innerHTML =
                        '<strong>Flagged Phrases:</strong>' +
                        '<div class="highlighted-content">' +
                            buildHighlightedText(text, result.highlights) +
                        '</div>';
                    highlightedBox.style.display = 'block';
                }

                // Reload history
                loadHistory();
            } else {
                resultBox.innerHTML = data.message;
                resultBox.style.borderColor = '#e74c3c';
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            resultBox.innerHTML = 'Error connecting to server. Please make sure the backend is running.';
            resultBox.style.borderColor = '#e74c3c';
        })
        .finally(function() {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze Article';
        });
    });
}

// ─── Image Upload + Analysis ───
var imageUploadArea = document.getElementById('imageUploadArea');
var imageInput = document.getElementById('imageInput');
var imagePreview = document.getElementById('imagePreview');
var previewImg = document.getElementById('previewImg');
var removeImageBtn = document.getElementById('removeImage');
var selectedFile = null;

if (imageUploadArea) {
    imageUploadArea.addEventListener('click', function() {
        imageInput.click();
    });

    imageUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        imageUploadArea.classList.add('dragover');
    });

    imageUploadArea.addEventListener('dragleave', function() {
        imageUploadArea.classList.remove('dragover');
    });

    imageUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        imageUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleImageSelect(e.dataTransfer.files[0]);
        }
    });
}

if (imageInput) {
    imageInput.addEventListener('change', function() {
        if (imageInput.files.length > 0) {
            handleImageSelect(imageInput.files[0]);
        }
    });
}

if (removeImageBtn) {
    removeImageBtn.addEventListener('click', function() {
        selectedFile = null;
        imagePreview.style.display = 'none';
        imageUploadArea.style.display = 'block';
        imageInput.value = '';
    });
}

function handleImageSelect(file) {
    var allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.indexOf(file.type) === -1) {
        alert('Please select a JPEG, PNG, GIF, or WebP image.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB.');
        return;
    }

    selectedFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
        imageUploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Check Image button
var checkImageBtn = document.getElementById('checkImageBtn');
if (checkImageBtn) {
    checkImageBtn.addEventListener('click', function() {
        var imageResultBox = document.getElementById('imageResultBox');

        if (!selectedFile) {
            imageResultBox.style.display = 'block';
            imageResultBox.innerHTML = 'Please select an image first.';
            imageResultBox.style.borderColor = '#e74c3c';
            imageResultBox.className = 'result-box';
            return;
        }

        checkImageBtn.disabled = true;
        checkImageBtn.textContent = 'Checking...';
        imageResultBox.style.display = 'block';
        imageResultBox.innerHTML = 'Analyzing image...';
        imageResultBox.style.borderColor = '#ddd';
        imageResultBox.className = 'result-box';

        var formData = new FormData();
        formData.append('image', selectedFile);

        var imgUser = JSON.parse(localStorage.getItem('loggedInUser'));
        fetch(API_URL + '/analyze-image', {
            method: 'POST',
            headers: imgUser ? { 'X-User-Email': imgUser.email } : {},
            body: formData
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                var r = data.result;
                var verdictClass = 'verdict-real';
                var barColor = '#27ae60';

                if (r.verdict === 'AI Generated') {
                    verdictClass = 'verdict-ai';
                    barColor = '#c0392b';
                } else if (r.verdict === 'Suspicious') {
                    verdictClass = 'verdict-suspicious';
                    barColor = '#f39c12';
                }

                var realScore = 100 - r.score;

                imageResultBox.innerHTML =
                    '<div class="score-verdict ' + verdictClass + '">' + r.verdict + '</div>' +
                    '<div class="score-section">' +
                        '<div class="score-label">' +
                            '<span>Authenticity</span>' +
                            '<span>' + realScore + '% real</span>' +
                        '</div>' +
                        '<div class="score-track">' +
                            '<div class="score-fill" style="width:' + realScore + '%; background-color:' + barColor + ';"></div>' +
                        '</div>' +
                    '</div>' +
                    '<p class="score-desc">AI generation probability: ' + r.score + '%</p>';

                imageResultBox.className = 'result-box';
                loadHistory();
            } else {
                imageResultBox.innerHTML = data.message || 'Error analyzing image.';
                imageResultBox.style.borderColor = '#e74c3c';
            }
        })
        .catch(function(error) {
            console.error('Image check error:', error);
            imageResultBox.innerHTML = 'Error connecting to server. Make sure the backend is running.';
            imageResultBox.style.borderColor = '#e74c3c';
        })
        .finally(function() {
            checkImageBtn.disabled = false;
            checkImageBtn.textContent = 'Check Image';
        });
    });
}

// Load analysis history into sidebar
function loadHistory() {
    var user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!user) return;

    var list = document.getElementById('historyList');
    var empty = document.getElementById('historyEmpty');
    if (!list) return;

    fetch(API_URL + '/history?email=' + encodeURIComponent(user.email))
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.success && data.analyses.length > 0) {
            if (empty) empty.style.display = 'none';

            list.innerHTML = data.analyses.map(function(a) {
                var verdictClass = '';
                if (a.verdict === 'Appears Credible') verdictClass = 'verdict-credible';
                else if (a.verdict === 'Possibly Misleading') verdictClass = 'verdict-warning';
                else verdictClass = 'verdict-fake';

                var category = a.category || 'general';
                var dateStr = new Date(a.createdAt).toLocaleDateString();
                var preview = a.text.length > 60 ? a.text.substring(0, 60) + '...' : a.text;

                return '<div class="sidebar-item">' +
                    '<div class="sidebar-item-verdict ' + verdictClass + '">' + a.verdict + '</div>' +
                    '<div class="sidebar-item-text">' + escapeHtml(preview) + '</div>' +
                    '<div class="sidebar-item-date">' + dateStr +
                        ' &middot; <span class="category-badge category-' + category + '">' +
                        category.charAt(0).toUpperCase() + category.slice(1) + '</span>' +
                    '</div>' +
                '</div>';
            }).join('');
        } else {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
        }
    })
    .catch(function(err) {
        console.error('History load error:', err);
    });
}


