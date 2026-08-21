/* ════════════════════════════════════════════════════════════
   Raphael Ramos · dual-mode portfolio
   Professional (default) ⇄ Personal — toggle, cursor trail, and
   all the shared interactions (typing, scroll, modals, music).
   ════════════════════════════════════════════════════════════ */

const root = document.documentElement;
const reduceMotionGlobal = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── MODE TOGGLE (Professional ⇄ Personal) ─────────────────────
// The inline <head> script already set data-mode before paint (URL
// ?mode=personal → localStorage → default 'pro'). Here we just wire
// the button and persist changes.
(function () {
    const toggle = document.getElementById('mode-toggle');
    if (!toggle) return;

    function setMode(mode) {
        root.setAttribute('data-mode', mode);
        try { localStorage.setItem('mode', mode); } catch (e) {}
        // Music shouldn't keep playing once you leave Personal mode.
        if (mode !== 'personal') {
            const audio = document.getElementById('music-audio');
            if (audio && !audio.paused) audio.pause();
        }
    }

    toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-mode') === 'personal' ? 'pro' : 'personal';
        setMode(next);
    });
})();

// ── GALAXY STARFIELD BACKGROUND (Three.js) ────────────────────
// A flattened 3D disc of soft round stars in three depth layers
// (faint dust, bright stars, red accents). Slowly rotates, gently
// ripples, twinkles, and parallax-tilts toward the mouse on desktop.
(function initBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const reduceMotion = reduceMotionGlobal;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (e) {
        return; // WebGL unsupported — page still works, just no background
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 18;

    const isLight = () => root.getAttribute('data-theme') === 'light' && root.getAttribute('data-mode') !== 'personal';

    // Soft round star sprite — turns square points into glowing dots
    const starTex = (function () {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0.0, 'rgba(255,255,255,1)');
        g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
        g.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
    })();

    const SPREAD = 50;   // overall size of the star cloud
    const DISC = 0.85;   // closer to 1 = even all-over starfield (not a disc)

    function makeLayer(count, size, color, opacity) {
        const pos = new Float32Array(count * 3);
        const baseY = new Float32Array(count);
        const phase = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * SPREAD;
            const y = (Math.random() - 0.5) * SPREAD * DISC;
            const z = (Math.random() - 0.5) * SPREAD;
            pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
            baseY[i] = y; phase[i] = Math.random() * Math.PI * 2;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            size, color, map: starTex, transparent: true, opacity,
            sizeAttenuation: true, depthWrite: false,
            blending: isLight() ? THREE.NormalBlending : THREE.AdditiveBlending,
        });
        return { pts: new THREE.Points(geo, mat), mat, geo, baseY, phase, count };
    }

    const group = new THREE.Group();
    scene.add(group);

    const dust   = makeLayer(isTouch ? 1100 : 3000, 0.10, isLight() ? 0x666666 : 0x9fb0d8, 0.4);
    const stars  = makeLayer(isTouch ? 260  : 650,  0.2,  isLight() ? 0x333333 : 0xffffff, 0.5);
    const bright = makeLayer(isTouch ? 45   : 95,   0.38, isLight() ? 0x222222 : 0xffffff, 0.55);
    const accent = makeLayer(isTouch ? 24   : 70,   0.42, 0xe63946,                        0.5);
    [dust, stars, bright, accent].forEach(l => group.add(l.pts));

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    if (!isTouch) {
        window.addEventListener('mousemove', (e) => {
            targetX = e.clientX / window.innerWidth - 0.5;
            targetY = e.clientY / window.innerHeight - 0.5;
        });
    }

    const clock = new THREE.Clock();
    function frame() {
        const t = clock.getElapsedTime();
        if (!isTouch) {
            const arr = dust.geo.attributes.position.array;
            for (let i = 0; i < dust.count; i++) {
                arr[i * 3 + 1] = dust.baseY[i] + Math.sin(t * 0.45 + dust.phase[i]) * 0.4;
            }
            dust.geo.attributes.position.needsUpdate = true;
        }
        group.rotation.y = t * 0.016;
        stars.mat.opacity = 0.5 * (0.78 + Math.sin(t * 1.3) * 0.22);
        curX += (targetX - curX) * 0.04;
        curY += (targetY - curY) * 0.04;
        camera.position.x = curX * 6;
        camera.position.y = -curY * 4;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        if (!reduceMotion) requestAnimationFrame(frame);
    }
    frame();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Starfield is a dark feature — fade it out on the light cream theme.
    function applyTheme() {
        canvas.style.opacity = isLight() ? '0' : '1';
    }
    applyTheme();
    new MutationObserver(applyTheme).observe(
        root, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });
})();

// ── RED CURSOR TRAIL (12 dots, Pro mode, desktop only) ────────
(function initCursorTrail() {
    const container = document.getElementById('cursor-trail');
    if (!container) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!finePointer || reduceMotionGlobal) return;

    const COUNT = 12;
    const dots = [];
    for (let i = 0; i < COUNT; i++) {
        const d = document.createElement('span');
        d.className = 'trail-dot';
        // Smaller and fainter toward the tail
        const scale = 1 - i / COUNT;
        d.style.setProperty('--s', scale.toFixed(3));
        container.appendChild(d);
        dots.push({ el: d, x: 0, y: 0 });
    }

    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    let active = false;
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        active = true;
    });

    function tick() {
        let px = mouseX, py = mouseY;
        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            dot.x += (px - dot.x) * 0.35;
            dot.y += (py - dot.y) * 0.35;
            const scale = 1 - i / COUNT;
            dot.el.style.transform =
                `translate(${dot.x}px, ${dot.y}px) translate(-50%, -50%) scale(${scale})`;
            dot.el.style.opacity = active ? (1 - i / COUNT) * 0.6 : 0;
            px = dot.x; py = dot.y;
        }
        requestAnimationFrame(tick);
    }
    tick();
})();

// ── TYPING EFFECT ─────────────────────────────────────────────
(function () {
    const typingEl = document.getElementById('typing-name');
    if (!typingEl) return;
    const lines = ['Raphael', 'Ramos'];
    let lineIndex = 0;
    let charIndex = 0;

    function type() {
        if (charIndex < lines[lineIndex].length) {
            typingEl.innerHTML = lines[0].substring(0, lineIndex === 0 ? charIndex + 1 : lines[0].length)
                + (lineIndex === 1 ? '<br>' + lines[1].substring(0, charIndex + 1) : '');
            charIndex++;
            setTimeout(type, 80);
        } else {
            lineIndex++;
            charIndex = 0;
            if (lineIndex < lines.length) {
                setTimeout(type, 200);
            } else {
                setTimeout(() => {
                    const c = document.querySelector('.cursor-blink');
                    if (c) c.style.opacity = '0';
                }, 1800);
            }
        }
    }
    setTimeout(type, 300);
})();

// ── SCROLL PROGRESS BAR + ACTIVE NAV ──────────────────────────
(function () {
    const progressBar = document.getElementById('scroll-progress');
    const navLinkEls = Array.from(document.querySelectorAll('.nav-links a'));
    const spySections = navLinkEls
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    function onScroll() {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
        if (progressBar) progressBar.style.width = pct + '%';

        const marker = window.scrollY + window.innerHeight * 0.35;
        let activeId = spySections[0] ? spySections[0].id : null;
        spySections.forEach(sec => {
            if (sec.offsetTop <= marker) activeId = sec.id;
        });
        navLinkEls.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === '#' + activeId);
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();

// ── SCROLL ANIMATIONS ─────────────────────────────────────────
(function () {
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('visible', entry.isIntersecting);
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('section:not(#hero)').forEach(s => sectionObserver.observe(s));

    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('card-visible', entry.isIntersecting);
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.project-card:not(.featured), .experience-item, .skill-category').forEach((card, i) => {
        card.classList.add(i % 2 === 0 ? 'slide-left' : 'slide-right');
        cardObserver.observe(card);
    });

    const featured = document.querySelector('.project-card.featured');
    if (featured) sectionObserver.observe(featured);
})();

// ── THEME TOGGLE (light/dark — Pro mode only) ─────────────────
(function () {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    themeToggle.addEventListener('click', () => {
        const isLight = root.getAttribute('data-theme') === 'light';
        const next = isLight ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    });
})();

// ── HAMBURGER MENU ────────────────────────────────────────────
(function () {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburger.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            hamburger.classList.remove('active');
        });
    });
})();

// Smooth-scroll on history back/forward between sections
window.addEventListener('hashchange', () => {
    const hash = location.hash;
    if (!hash || hash === '#') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
});

// ── PROJECT DEEP-DIVE MODALS ──────────────────────────────────
const projectDetails = {
    "Continuing Care Home Activity Monitor": {
        context: "Capstone · ECE 492 · Jan – Apr 2026",
        video: "SDkYA16DcgQ",
        stack: ["C++", "MicroPython", "Edge Impulse", "AWS IoT", "MQTT/TLS", "DynamoDB", "Lambda", "React Native"],
        brief: "A non-invasive system that helps elderly residents age safely in place — three subsystems watch for stove, water, and appliance activity, run ML on-device, and stream alerts to a caregiver app. I led the stove-safety subsystem.",
        built: [
            "Built the stove-safety subsystem on a Raspberry Pi Pico 2W — an MLX90614 infrared sensor for non-contact burner heat, a DS18B20 contact sensor for the oven, and a PIR sensor to detect whether anyone is nearby.",
            "Deployed an Edge Impulse model on-device to classify burner state and fused it with the motion sensor, so an alert only fires when the stove is hot and no one is around — 97.73% accuracy with an under-10-second response.",
            "Wired a full AWS IoT pipeline — MQTT over TLS into IoT Core, Lambda anomaly detection, DynamoDB storage — feeding a React Native caregiver app with real-time alerts and activity history.",
            "Kept the prototype under $200 CAD, proving the concept is deployable at real-world cost."
        ],
        insight: "An unattended hot stove isn't just 'hot' — it's hot with nobody nearby. Detection only became reliable once it fused the burner-heat model with motion, instead of trusting either signal alone.",
        links: []
    },
    "Rotary Encoder HMI": {
        context: "ECE 407 · Project 1 · Embedded HMI",
        video: "q_OnzubR1rI",
        stack: ["C", "RP2040 PIO", "WS2812", "Quadrature Decode", "State Machine", "GDB"],
        brief: "An embedded human-machine interface built around a PEL12T mechanical rotary encoder and a WS2812 RGB LED ring on the RP2040 — wrapped in a Russian-roulette game where six chambers map to twelve LEDs.",
        built: [
            "Decoded the quadrature encoder with a transition lookup table, accumulating the multiple electrical transitions per detent so no clicks were skipped.",
            "Drove the WS2812 ring through the RP2040's PIO, offloading the strict LED timing off the main loop.",
            "Structured the firmware as a state machine — Idle, Arming, Ready, Reveal, Game Over — so a spin or button press meant something different in each state.",
            "Traced a stuck-button bug to the encoder being wired to 3.3V instead of GND, and fixed it by switching the GPIO to pull-down and inverting the read."
        ],
        insight: "Reading the datasheet beat guessing — the 'always pressed' button wasn't a code bug, it was a wrong pull-up vs pull-down assumption about how the board was wired.",
        links: []
    },
    "DC Motor Speed Controller": {
        context: "ECE 407 · Project 2 · Control Systems",
        video: "njNi2PRX1Rw",
        stack: ["C", "PWM", "ADC", "TC1508A H-bridge", "Wokwi"],
        brief: "An open-loop DC motor controller on the RP2040 — a potentiometer sets speed and direction through a TC1508A H-bridge, with a tachometer-style LED ring reacting in real time.",
        built: [
            "Read a potentiometer on ADC0 (0–4095) and scaled it to a PWM duty cycle (0–999) driving motor speed through the H-bridge.",
            "Used the potentiometer's midpoint as a direction switch with a dead zone — below centre reverses, above drives forward, centre stops — no extra buttons.",
            "Animated a WS2812 ring as a tachometer: green→yellow→red filling with speed (flashing at the limit), blue→purple in reverse.",
            "Prototyped it in Wokwi first — two LEDs standing in for the H-bridge, verified on a logic analyzer — before moving to real hardware."
        ],
        insight: "Most of the bugs were hardware, not code — a pin/pixel mismatch and powering the motor off the wrong rail. Proving the logic in Wokwi first meant I knew the firmware was right when the wiring fought back.",
        links: []
    },
    "Voice-Controlled Fan": {
        context: "ECE 407 · Project 3 · TinyML",
        video: "0YUXNzxJXc8",
        stack: ["C / C++", "TinyML", "I2S", "INMP441", "TensorFlow Lite"],
        brief: "A wake-word-controlled DC fan on the RP2040 — say \"yes\" to turn it on, \"no\" to turn it off — reusing a micro_speech TFLite model wired to real fan hardware, fully offline.",
        built: [
            "Streamed audio from an INMP441 microphone over an I2S path built on PIO + a DMA ring buffer, so capture ran continuously without stalling inference.",
            "Integrated the provided micro_speech wake-word model rather than training one — the real work was the hardware path and control logic, not the ML.",
            "Tamed noisy detections with three rules — a confidence threshold, a new-command gate, and an 1800 ms cooldown — so one spoken word triggered exactly one action.",
            "Kept the potentiometer for manual speed and direction: voice for on/off, the knob for fine control."
        ],
        insight: "A model's output is a noisy input, not a clean button press — usable voice control came from the filtering rules around it, not the model itself.",
        links: []
    },
    "Event Lottery App": {
        context: "Course Project · Sept – Nov 2024",
        image: "/assets/eventlottery.jpg",
        stack: ["Java", "Android Studio", "Firebase Firestore"],
        brief: "An Android app implementing a fair, lottery-based signup system for high-demand events, backed by Firebase.",
        built: [
            "Built a fair lottery-based signup flow for oversubscribed events, backed by a real-time Firebase Firestore database.",
            "Added local push notifications and deep linking for entrants and organizers.",
            "Applied OOP design — CRC cards and UML — with comprehensive JUnit test coverage for maintainability."
        ],
        insight: "Fairness is a feature you design for — a lottery only feels fair if the rules are transparent and the implementation is provably unbiased.",
        links: [{ label: "GitHub →", href: "https://github.com/ErenPaper/EventLotteryApp" }]
    },
    "Anomaly Detection System": {
        context: "Machine Learning · Apr 2025",
        stack: ["Python", "Scikit-learn", "Pandas", "Matplotlib"],
        brief: "An end-to-end anomaly detection pipeline comparing statistical, distance-based, and ML approaches on the same data.",
        built: [
            "Implemented and compared statistical, distance-based (k-NN, DBSCAN), and ML (One-Class SVM) detection techniques.",
            "Built the preprocessing — missing-value handling, normalization, and stratified train/test/validation splits — before modelling.",
            "Evaluated each approach with precision, recall, F1-score, and ROC/PR curves.",
            "Documented the full pipeline in a reproducible Jupyter notebook."
        ],
        insight: "No single anomaly detector wins everywhere — the value was in showing where each method breaks, not just where it works.",
        links: [{ label: "GitHub →", href: "https://github.com/ErenPaper/Anomaly-Detection-System" }]
    },
    "16-bit CPU Design": {
        context: "Digital Logic · Nov 2024",
        stack: ["VHDL", "Vivado", "Xilinx Zybo Z7", "FPGA"],
        brief: "A 16-bit CPU designed from scratch on a Xilinx Zybo Z7 FPGA, with a full controller-datapath architecture.",
        built: [
            "Designed a controller-datapath architecture with an ALU, register file, accumulators, and a tri-state buffer.",
            "Built an FSM executing 13 custom instructions, with a bitwise multiplier written as a validation test program.",
            "Resolved a double-access load discrepancy through rigorous simulation and debugging in Vivado."
        ],
        insight: "Building a CPU from the gate level up makes every abstraction above it — assembly, C, the OS — feel earned rather than magic.",
        links: []
    },
    "File Sharing System": {
        context: "Systems · Networking",
        stack: ["C", "Sockets", "TCP/UDP"],
        brief: "A client-server file sharing application in C built on custom socket protocols and nonblocking I/O.",
        built: [
            "Implemented custom TCP/UDP socket protocols with enforced packet formats and error handling.",
            "Used nonblocking I/O to handle multiple concurrent connections on a single server."
        ],
        insight: "Writing the protocol by hand showed how much work TCP normally hides — every dropped packet and partial read had to be planned for.",
        links: []
    }
};

(function () {
    // Tag every entry with its own title
    Object.keys(projectDetails).forEach(k => { projectDetails[k].title = k; });

    const modal = document.getElementById('project-modal');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');
    if (!modal || !modalContent || !modalClose) return;

    // Order prev/next by the cards actually on the page (and that have details)
    const projectOrder = [];
    document.querySelectorAll('.project-card h3').forEach(h3 => {
        const title = h3.textContent.trim();
        if (projectDetails[title] && projectOrder.indexOf(title) === -1) projectOrder.push(title);
    });

    function openModal(data) {
        const stack = data.stack.map(s => `<span>${s}</span>`).join('');
        const built = data.built.map(b => `<li>${b}</li>`).join('');
        const links = (data.links || []).map(l =>
            `<a href="${l.href}" target="_blank" class="modal-link">${l.label}</a>`).join('');
        let media = '';
        if (data.video) {
            media = `<div class="modal-media"><div class="project-video-wrap"><iframe src="https://www.youtube.com/embed/${data.video}" title="${data.title} demo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
        } else if (data.image) {
            media = `<div class="modal-media"><img src="${data.image}" alt="${data.title}"></div>`;
        }
        const idx = projectOrder.indexOf(data.title);
        const prevKey = projectOrder[idx - 1];
        const nextKey = projectOrder[idx + 1];
        const nav = `<div class="modal-nav">
            ${prevKey ? `<button class="modal-nav-btn prev" data-key="${prevKey}"><span class="modal-nav-dir">← prev</span><span class="modal-nav-name">${prevKey}</span></button>` : '<span></span>'}
            ${nextKey ? `<button class="modal-nav-btn next" data-key="${nextKey}"><span class="modal-nav-dir">next →</span><span class="modal-nav-name">${nextKey}</span></button>` : '<span></span>'}
        </div>`;

        modalContent.innerHTML = `
            ${media}
            <span class="modal-context">${data.context}</span>
            <h3 id="modal-title">${data.title}</h3>
            <div class="modal-stack">${stack}</div>
            <p class="modal-brief">${data.brief}</p>
            <h4 class="modal-heading">What I built</h4>
            <ul class="modal-built">${built}</ul>
            <div class="modal-insight"><span class="modal-insight-label">Key insight</span>${data.insight}</div>
            ${links ? `<div class="modal-links">${links}</div>` : ''}
            ${nav}`;
        modalContent.querySelectorAll('.modal-nav-btn').forEach(b =>
            b.addEventListener('click', () => openModal(projectDetails[b.dataset.key])));
        modal.scrollTop = 0;
        modal.querySelector('.modal').scrollTop = 0;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        modalClose.focus();
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (!modal.classList.contains('open')) modalContent.innerHTML = '';
        }, 320);
    }

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const TILT_MAX = 6; // degrees

    document.querySelectorAll('.project-card').forEach(card => {
        const h3 = card.querySelector('h3');
        if (!h3) return;
        const data = projectDetails[h3.textContent.trim()];
        if (!data) return;

        // Thumbnail (poster image) — a lightweight visual hook; the card opens the modal.
        const src = data.video
            ? `https://img.youtube.com/vi/${data.video}/hqdefault.jpg`
            : data.image;
        if (src) {
            const thumb = document.createElement('div');
            thumb.className = 'project-thumb';
            thumb.innerHTML = `<img src="${src}" alt="${data.title} preview" loading="lazy">` +
                (data.video ? '<span class="thumb-play" aria-hidden="true"></span>' : '');
            card.insertBefore(thumb, card.firstChild);
        }

        const cue = document.createElement('span');
        cue.className = 'project-details-btn';
        cue.innerHTML = 'View details <span aria-hidden="true">→</span>';
        card.appendChild(cue);

        card.classList.add('clickable');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View details: ${data.title}`);
        card.addEventListener('click', () => openModal(data));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(data); }
        });

        // 3D tilt toward the cursor (desktop only; skip the big featured card)
        if (finePointer && !card.classList.contains('featured')) {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                const rx = (0.5 - py) * TILT_MAX * 2;
                const ry = (px - 0.5) * TILT_MAX * 2;
                card.style.transition = 'transform 0s';
                card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.5s cubic-bezier(.03,.98,.52,.99)';
                card.style.transform = '';
            });
        }
    });

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
})();

// ── ANIMATED STAT COUNTERS ────────────────────────────────────
(function () {
    const stats = document.querySelectorAll('.project-stats span');
    if (!stats.length || reduceMotionGlobal) return;

    const parsed = [];
    stats.forEach(el => {
        const m = el.textContent.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/s);
        if (!m) return;
        const decimals = m[2].includes('.') ? m[2].split('.')[1].length : 0;
        parsed.push({ el, prefix: m[1], target: parseFloat(m[2]), suffix: m[3], decimals });
        el.textContent = m[1] + (0).toFixed(decimals) + m[3];
    });

    function run(item) {
        const dur = 1200, start = performance.now();
        function step(now) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = (item.target * eased).toFixed(item.decimals);
            item.el.textContent = item.prefix + val + item.suffix;
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const item = parsed.find(p => p.el === e.target);
            if (item) run(item);
            o.unobserve(e.target);
        });
    }, { threshold: 0.6 });
    parsed.forEach(p => obs.observe(p.el));
})();

// ── BACK TO TOP ───────────────────────────────────────────────
(function () {
    const backToTop = document.getElementById('back-to-top');
    if (!backToTop) return;
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// ── BACKGROUND MUSIC (Personal mode; off by default, never autoplays) ──
(function () {
    const audio = document.getElementById('music-audio');
    const toggle = document.getElementById('music-toggle');
    const vol = document.getElementById('music-vol');
    const player = document.getElementById('music-player');
    if (!audio || !toggle) return;

    audio.src = '/assets/music.mp3'; // drop your track here (your own piano is perfect)
    audio.volume = vol.value / 100;

    toggle.addEventListener('click', () => {
        if (audio.paused) audio.play().catch(() => {}); else audio.pause();
    });
    audio.addEventListener('play', () => {
        player.classList.add('playing');
        toggle.setAttribute('aria-label', 'Pause music');
    });
    audio.addEventListener('pause', () => {
        player.classList.remove('playing');
        toggle.setAttribute('aria-label', 'Play music');
    });
    vol.addEventListener('input', () => { audio.volume = vol.value / 100; });
})();
