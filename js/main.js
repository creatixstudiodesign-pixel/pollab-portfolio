/* ============================================================
   main.js  (about.js + download.js + nav.js in one file)
   Load AFTER js/script.js on both index.html and about.html.
   Every part checks that its elements exist, so it is safe on both pages.

   1. Navigation        (index.html)  - click a menu link, see exactly that section
   2. About page        (about.html)  - scroll reveal, counters, skill bars
   3. Forced download   (any page)    - optional: links with data-download
   ============================================================ */


/* ------------------------------------------------------------
   1. NAVIGATION (home page only)
   Clicking a link shows exactly that section:
   Home, About, Services, Skills, Portfolio, Testimonials, Contact
   ------------------------------------------------------------ */
(function () {
    if (!document.getElementById('home')) return; // not the home page

    var header = document.getElementById('header');
    var nav = document.getElementById('nav');
    var links = document.querySelectorAll('.nav__link');
    var sectionIds = ['home', 'about', 'services', 'skills', 'portfolio', 'testimonials', 'contact'];

    function headerHeight() {
        return header ? header.offsetHeight : 80;
    }

    // How many extra pixels to scroll past the section start, so the content sits a bit higher on screen.
    // Make it bigger (e.g. 70) to move the content higher, smaller (e.g. 20) to bring it back down. 0 = no extra.
    var EXTRA_OFFSET = 50;

    // Per-section override. These sections go a little higher than the rest.
    // Change a number to move that one section (bigger = content higher, smaller = lower).
    var SECTION_OFFSET = {
        services: 80,
        skills: 80,
        portfolio: 80,
        contact: 80
    };

    // Where the page must be scrolled so the section starts right under the header
    function targetTop(el) {
        if (el.id === 'home') return 0;
        var extra = SECTION_OFFSET.hasOwnProperty(el.id) ? SECTION_OFFSET[el.id] : EXTRA_OFFSET;
        return el.getBoundingClientRect().top + window.pageYOffset - headerHeight() + extra;
    }

    function setActive(id) {
        links.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
    }

    function goTo(id, instant) {
        var el = document.getElementById(id);
        if (!el) return;

        window.scrollTo({ top: targetTop(el), behavior: instant ? 'auto' : 'smooth' });
        setActive(id);

        // Images/fonts can still be loading and move things around while scrolling.
        // After the scroll finishes, check the position once more and correct it.
        setTimeout(function () {
            if (Math.abs(window.pageYOffset - targetTop(el)) > 3) {
                window.scrollTo({ top: targetTop(el), behavior: 'auto' });
            }
        }, instant ? 100 : 900);
    }

    // Handle every in-page link (menu, buttons, footer links, scroll-down, back-to-top)
    document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;

        var id = a.getAttribute('href').slice(1);
        if (!id || !document.getElementById(id)) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        if (nav) nav.classList.remove('show'); // close the mobile menu
        goTo(id, false);
    }, true);

    // Highlight the menu link of the section currently on screen
    function onScroll() {
        var probe = headerHeight() + window.innerHeight * 0.35;
        var current = sectionIds[0];
        sectionIds.forEach(function (id) {
            var el = document.getElementById(id);
            if (el && el.getBoundingClientRect().top <= probe) current = id;
        });
        setActive(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Opened from another page like index.html#services
    window.addEventListener('load', function () {
        var id = location.hash.slice(1);
        if (id && document.getElementById(id)) {
            setTimeout(function () { goTo(id, true); }, 150);
        }
    });
})();


/* ------------------------------------------------------------
   2. ABOUT PAGE: scroll reveal, animated counters, skill bars
   ------------------------------------------------------------ */
(function () {
    var reveals = document.querySelectorAll('.ab-reveal');
    var bars = document.querySelectorAll('.ab-bar');
    var counts = document.querySelectorAll('.ab-count');

    if (!reveals.length && !bars.length && !counts.length) return; // not the about page

    function animateCount(el) {
        var to = parseInt(el.getAttribute('data-to'), 10) || 0;
        var duration = 1600;
        var start = null;
        function tick(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(to * eased);
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    if (!('IntersectionObserver' in window)) {
        reveals.forEach(function (el) { el.classList.add('is-in'); });
        bars.forEach(function (b) { b.querySelector('.ab-bar__fill').style.width = b.dataset.level + '%'; });
        counts.forEach(function (c) { c.textContent = c.getAttribute('data-to'); });
        return;
    }

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
        });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });

    var barObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var fill = entry.target.querySelector('.ab-bar__fill');
            fill.style.width = entry.target.dataset.level + '%';
            barObs.unobserve(entry.target);
        });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { barObs.observe(b); });

    var countObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            animateCount(entry.target);
            countObs.unobserve(entry.target);
        });
    }, { threshold: 0.6 });
    counts.forEach(function (c) { countObs.observe(c); });
})();


/* ------------------------------------------------------------
   2b. HOME PAGE SKILLS: skill bars + stat counters
   Safety net: when the Skills section comes into view, fill the bars and
   count up the numbers. If script.js already did it, this does nothing.
   ------------------------------------------------------------ */
(function () {
    var bars = document.querySelectorAll('.skill-item__progress');
    var nums = document.querySelectorAll('.stat-item__number');
    if (!bars.length && !nums.length) return;

    function fillBar(bar) {
        var w = bar.getAttribute('data-width');
        if (w && parseFloat(bar.style.width) === 0) bar.style.width = w + '%';
    }

    function countUp(el) {
        var to = parseInt(el.getAttribute('data-target'), 10) || 0;
        if (parseInt(el.textContent, 10) > 0) return; // already counting / done
        var start = null;
        function tick(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / 1600, 1);
            el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function run() {
        bars.forEach(fillBar);
        nums.forEach(countUp);
    }

    var section = document.getElementById('skills');
    if (!section || !('IntersectionObserver' in window)) { run(); return; }

    var obs = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        // give script.js a moment to do it first
        setTimeout(run, 700);
    }, { threshold: 0.25 });
    obs.observe(section);
})();


/* ------------------------------------------------------------
   3. FORCED DOWNLOAD (optional)
   Forces a direct file download (no new tab) for links with "data-download".
   Usage: <a href="cv/Pollab-CV.pdf" data-download="MD-Fuyad-Hasan-Pollab-CV.pdf">Download CV</a>
   Right now the CV buttons open in a new tab (target="_blank"), so this is not used.
   ------------------------------------------------------------ */
(function () {
    function saveBlob(blob, name) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest ? e.target.closest('a[data-download]') : null;
        if (!link) return;

        var href = link.getAttribute('href');
        var name = link.getAttribute('data-download') || href.split('/').pop();

        // Works only when the site is served over http(s). Opened as a plain local file it falls back to the normal link.
        if (!window.fetch || location.protocol === 'file:') return;

        e.preventDefault();
        fetch(href)
            .then(function (res) {
                if (!res.ok) throw new Error('File not found: ' + href);
                return res.blob();
            })
            .then(function (blob) { saveBlob(blob, name); })
            .catch(function () {
                alert('CV file not found. Please make sure the file exists at: ' + href);
            });
    });
})();
