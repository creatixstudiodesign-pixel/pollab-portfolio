/* Core interactions for the portfolio home page. */
document.addEventListener('DOMContentLoaded', function () {
    // Mobile navigation on standalone pages
    var navToggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('nav');
    if (navToggle && nav) {
        navToggle.addEventListener('click', function () {
            var isOpen = nav.classList.toggle('show');
            navToggle.setAttribute('aria-expanded', String(isOpen));
            var icon = navToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isOpen);
                icon.classList.toggle('fa-times', isOpen);
            }
        });
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('show');
                navToggle.setAttribute('aria-expanded', 'false');
                var icon = navToggle.querySelector('i');
                if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-times'); }
            });
        });
    }
    // Typing headline
    var typingText = document.querySelector('.hero__typing-text');
    if (typingText) {
        var words = ['Graphics Designer', 'Adobe Photoshop Expert', 'Adobe Illustrator Pro', 'WordPress Developer', 'Creative Thinker'];
        var wordIndex = 0;
        var charIndex = 0;
        var deleting = false;
        function typeNext() {
            var word = words[wordIndex];
            charIndex += deleting ? -1 : 1;
            typingText.textContent = word.slice(0, charIndex);
            var delay = deleting ? 45 : 95;
            if (!deleting && charIndex === word.length) { deleting = true; delay = 1500; }
            else if (deleting && charIndex === 0) { deleting = false; wordIndex = (wordIndex + 1) % words.length; delay = 350; }
            window.setTimeout(typeNext, delay);
        }
        window.setTimeout(typeNext, 500);
    }

    // Portfolio category filters
    var filterButtons = document.querySelectorAll('.filter-btn');
    var portfolioItems = document.querySelectorAll('.portfolio-item');
    filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var selected = button.getAttribute('data-filter');
            filterButtons.forEach(function (item) {
                item.classList.toggle('active', item === button);
                item.setAttribute('aria-pressed', String(item === button));
            });
            portfolioItems.forEach(function (item) {
                var matches = selected === 'all' || item.getAttribute('data-category') === selected;
                item.classList.toggle('hide', !matches);
                item.setAttribute('aria-hidden', String(!matches));
            });
        });
    });

    // Full portfolio project preview dialog
    var projectDialog = document.getElementById('portfolio-modal');
    var lastProjectTrigger = null;
    if (projectDialog) {
        var projectImage = document.getElementById('portfolio-modal-image');
        var projectTitle = document.getElementById('portfolio-modal-title');
        var projectCategory = document.getElementById('portfolio-modal-category');
        document.querySelectorAll('[data-project-open]').forEach(function (trigger) {
            trigger.addEventListener('click', function () {
                lastProjectTrigger = trigger;
                projectTitle.textContent = trigger.getAttribute('data-title') || 'Project preview';
                projectCategory.textContent = trigger.getAttribute('data-category') || '';
                projectImage.src = trigger.getAttribute('data-image') || '';
                projectImage.alt = 'Project preview: ' + projectTitle.textContent;
                if (typeof projectDialog.showModal === 'function') projectDialog.showModal();
                else projectDialog.setAttribute('open', '');
            });
        });
        var closeProject = projectDialog.querySelector('[data-project-close]');
        if (closeProject) closeProject.addEventListener('click', function () { projectDialog.close(); });
        projectDialog.addEventListener('click', function (event) {
            if (event.target === projectDialog) projectDialog.close();
        });
        projectDialog.addEventListener('close', function () {
            if (lastProjectTrigger) lastProjectTrigger.focus();
        });
    }
    // Client testimonial carousel: arrows, dots, autoplay, and pause on hover.
    var slides = Array.from(document.querySelectorAll('.testimonial-slide'));
    var dots = Array.from(document.querySelectorAll('.testimonials__dots .dot'));
    var previous = document.getElementById('testimonial-prev');
    var next = document.getElementById('testimonial-next');
    var slider = document.getElementById('testimonial-slider');
    if (slides.length) {
        var current = Math.max(0, slides.findIndex(function (slide) { return slide.classList.contains('active'); }));
        var timer = null;
        function showSlide(index) {
            current = (index + slides.length) % slides.length;
            slides.forEach(function (slide, i) {
                slide.classList.toggle('active', i === current);
                slide.setAttribute('aria-hidden', String(i !== current));
            });
            dots.forEach(function (dot, i) {
                dot.classList.toggle('active', i === current);
                dot.setAttribute('aria-current', i === current ? 'true' : 'false');
            });
        }
        function stopAutoplay() { if (timer) { window.clearInterval(timer); timer = null; } }
        function startAutoplay() { stopAutoplay(); if (slides.length > 1) timer = window.setInterval(function () { showSlide(current + 1); }, 5000); }
        if (previous) previous.addEventListener('click', function () { showSlide(current - 1); startAutoplay(); });
        if (next) next.addEventListener('click', function () { showSlide(current + 1); startAutoplay(); });
        dots.forEach(function (dot, i) { dot.addEventListener('click', function () { showSlide(i); startAutoplay(); }); });
        if (slider) {
            slider.addEventListener('mouseenter', stopAutoplay);
            slider.addEventListener('mouseleave', startAutoplay);
            slider.addEventListener('focusin', stopAutoplay);
            slider.addEventListener('focusout', startAutoplay);
        }
        showSlide(current);
        startAutoplay();
    }

    // Header and back-to-top state
    var header = document.getElementById('header');
    var backToTop = document.getElementById('back-to-top');
    function updateScrollState() {
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
        if (backToTop) backToTop.classList.toggle('show', window.scrollY > 500);
    }
    window.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();

    // Skills bars and counters animate when their section enters view.
    var skills = document.getElementById('skills');
    if (skills) {
        var animated = false;
        function animateSkills() {
            if (animated || skills.getBoundingClientRect().top > window.innerHeight - 80) return;
            animated = true;
            document.querySelectorAll('.skill-item__progress').forEach(function (bar) {
                var width = bar.getAttribute('data-width');
                if (width) bar.style.width = width + '%';
            });
            document.querySelectorAll('.stat-item__number').forEach(function (counter) {
                var target = parseInt(counter.getAttribute('data-target'), 10);
                if (!Number.isFinite(target)) return;
                var start = null;
                function tick(time) {
                    if (start === null) start = time;
                    var progress = Math.min((time - start) / 1400, 1);
                    counter.textContent = String(Math.floor(target * progress));
                    if (progress < 1) window.requestAnimationFrame(tick);
                }
                window.requestAnimationFrame(tick);
            });
        }
        window.addEventListener('scroll', animateSkills, { passive: true });
        animateSkills();
    }

    // Send contact form submissions to the local Node backend.
    var form = document.getElementById('contact-form');
    if (form) {
        var requestedService = new URLSearchParams(window.location.search).get('service');
        var subjectField = form.querySelector('[name="subject"]');
        if (requestedService && subjectField && !subjectField.value) {
            subjectField.value = 'Project inquiry: ' + requestedService.slice(0, 100);
        }
    }
    if (form) form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var status = document.getElementById('contact-form-status');
        var button = form.querySelector('button[type="submit"]');
        var buttonText = button ? button.querySelector('span') : null;
        var originalText = buttonText ? buttonText.textContent : 'Send Message';
        if (!status) {
            status = document.createElement('p');
            status.id = 'contact-form-status';
            status.className = 'section__description';
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
            form.appendChild(status);
        }
        if (window.location.protocol === 'file:') {
            status.textContent = 'Start the project server with node server.js and open http://localhost:3000 to send your message.';
            return;
        }
        if (button) button.disabled = true;
        if (buttonText) buttonText.textContent = 'Sending...';
        status.textContent = 'Sending your message...';
        try {
            var payload = Object.fromEntries(new FormData(form).entries());
            var response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Message could not be sent.');
            status.textContent = result.message || 'Thanks! Your message has been sent.';
            form.reset();
        } catch (error) {
            status.textContent = error.message || 'Could not reach the email server. Please try again or email directly.';
        } finally {
            if (button) button.disabled = false;
            if (buttonText) buttonText.textContent = originalText;
        }
    });
});

// Newsletter subscription to Google Sheets
var newsletterForm = document.getElementById('newsletter-form');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        var emailInput = newsletterForm.querySelector('[name="email"]');
        var button = newsletterForm.querySelector('button');
        var status = document.getElementById('newsletter-status');

        var email = emailInput.value.trim().toLowerCase();

        if (!email) return;

        button.disabled = true;
        status.textContent = 'Subscribing...';

        try {
            await fetch(
                'https://script.google.com/macros/s/AKfycby4cx7SXn7FZjO7fTlps1KSptZWQQQE3a-UxL_YGOiWOqYeE_nLAGYrMAkwLn5Ho7vL/exec',
                {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'text/plain;charset=UTF-8'
                    },
                    body: JSON.stringify({ email: email })
                }
            );

            status.textContent =
                'Subscription request submitted! Thank you.';

            newsletterForm.reset();

        } catch (error) {
            status.textContent =
                'Something went wrong. Please try again.';
        } finally {
            button.disabled = false;
        }
    });
}








