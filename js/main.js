(() => {
  "use strict";

  const M = window.MEDIA;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const map = (v, a, b) => clamp((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------------
   * MÉDIAS
   * ------------------------------------------------------------------ */
  const imgTargets = {
    emblemImg: M.emblem, wireImg: M.wireframe, realImg: M.exterior,
    tourFallbackA: M.exterior, tourFallbackB: M.rear,
    enterFallbackA: M.rear, interiorImg: M.interior,
    wheelImg: M.wheel, dragFallback: M.exterior
  };
  Object.entries(imgTargets).forEach(([id, src]) => { const el = document.getElementById(id); if (el) el.src = src; });
  $$("[data-media]").forEach(el => { el.src = M[el.dataset.media]; el.loading = "lazy"; });

  /* ------------------------------------------------------------------
   * LOADER
   * ------------------------------------------------------------------ */
  function preload(urls) {
    let done = 0;
    const bar = $("#loaderBar"), pct = $("#loaderPct");
    const tick = () => {
      done++;
      const p = Math.round((done / urls.length) * 100);
      bar.style.width = p + "%";
      pct.textContent = p + "%";
    };
    return Promise.all(urls.map(u => new Promise(res => {
      const i = new Image();
      const t = setTimeout(() => { tick(); res(); }, 9000);
      i.onload = i.onerror = () => { clearTimeout(t); tick(); res(); };
      i.src = u;
    })));
  }

  gsap.to(".loader__word span", { opacity: 1, y: 0, duration: 1, stagger: .07, ease: "power3.out" });

  preload([M.emblem, M.wireframe, M.exterior]).then(() => {
    const tl = gsap.timeline({ delay: .4 });
    tl.to(".loader__word span", { opacity: 0, y: "-30%", duration: .6, stagger: .04, ease: "power2.in" })
      .to("#loader", { opacity: 0, duration: .8, ease: "power2.out" }, "-=.1")
      .add(() => { $("#loader").remove(); document.body.classList.remove("is-loading"); ScrollTrigger.refresh(); })
      .from(".hero__title span", { yPercent: 110, opacity: 0, duration: 1.4, stagger: .12, ease: "expo.out" }, "-=.3")
      .from(".hero__copy .eyebrow, .hero__sub", { opacity: 0, y: 20, duration: 1, stagger: .1 }, "-=1.1")
      .from("#emblemImg", { scale: 1.35, filter: "brightness(0)", duration: 2.4, ease: "expo.out" }, "-=1.6");
  });

  /* ------------------------------------------------------------------
   * SMOOTH SCROLL
   * ------------------------------------------------------------------ */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { duration: 2.2 }) : target.scrollIntoView({ behavior: "smooth" });
  }));

  /* barre de progression globale */
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: s => { $("#navProgress").style.transform = `scaleX(${s.progress})`; }
  });

  /* ------------------------------------------------------------------
   * VIDÉO PILOTÉE AU SCROLL
   * ------------------------------------------------------------------ */
  function scrubVideo(video, url, wrap) {
    const state = { target: 0, current: 0, ready: false };
    if (!url) { wrap.classList.add("no-video"); return state; }

    const attach = src => {
      video.src = src;
      video.load();
      video.addEventListener("loadedmetadata", () => { state.ready = true; video.pause(); }, { once: true });
      video.addEventListener("error", () => wrap.classList.add("no-video"), { once: true });
    };
    // Téléchargement complet en blob = seek instantané. Repli : URL directe.
    fetch(url, { mode: "cors" })
      .then(r => { if (!r.ok) throw 0; return r.blob(); })
      .then(b => attach(URL.createObjectURL(b)))
      .catch(() => attach(url));

    const loop = () => {
      if (state.ready && video.duration) {
        state.current = lerp(state.current, state.target, .12);
        const t = state.current * (video.duration - .05);
        if (!video.seeking && Math.abs(video.currentTime - t) > .008) video.currentTime = t;
      }
      requestAnimationFrame(loop);
    };
    loop();
    return state;
  }

  /* ------------------------------------------------------------------
   * 1. HERO — EMBLÈME PUIS CONSTRUCTION
   * ------------------------------------------------------------------ */
  const emblemLayer = $("#emblemLayer");
  window.addEventListener("pointermove", e => {
    const x = e.clientX / innerWidth, y = e.clientY / innerHeight;
    emblemLayer.style.setProperty("--gx", (x * 100) + "%");
    emblemLayer.style.setProperty("--gy", (y * 100) + "%");
    gsap.to("#emblemImg", { x: (x - .5) * -30, y: (y - .5) * -20, duration: 1.2, ease: "power3.out", overwrite: "auto" });
  });

  const sparks = $("#sparks"), sctx = sparks.getContext("2d");
  const particles = [];
  function sizeCanvas(c) { const d = Math.min(devicePixelRatio, 2); c.width = c.clientWidth * d; c.height = c.clientHeight * d; c.getContext("2d").setTransform(d, 0, 0, d, 0, 0); }
  sizeCanvas(sparks);
  let scanX = -1, scanActive = false;
  function emitSparks() {
    if (scanActive && scanX >= 0) {
      const h = sparks.clientHeight;
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: scanX, y: h * (.18 + Math.random() * .7),
          vx: (Math.random() * 2.5 + .5), vy: (Math.random() - .5) * 1.6,
          life: 1, s: Math.random() * 1.8 + .4
        });
      }
    }
    sctx.clearRect(0, 0, sparks.clientWidth, sparks.clientHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += .02; p.life -= .022;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      sctx.globalAlpha = p.life;
      sctx.fillStyle = p.life > .6 ? "#fff" : "#c9a96e";
      sctx.beginPath(); sctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); sctx.fill();
    }
    sctx.globalAlpha = 1;
    requestAnimationFrame(emitSparks);
  }
  emitSparks();

  const hudPct = $("#hudPct"), steps = $$("#hudSteps li"), realWrap = $("#realWrap"), scan = $("#scan");
  const heroTl = gsap.timeline({ defaults: { ease: "none" } })
    .to("#scrollHint", { opacity: 0, duration: .04 }, 0)
    .to("#heroCopy", { opacity: 0, y: -60, duration: .12 }, 0.02)
    .to("#emblemImg", { scale: 1.9, filter: "brightness(1.6) blur(2px)", duration: .24 }, 0)
    .to("#emblemLayer", { opacity: 0, duration: .1 }, .17)
    .to("#buildLayer", { opacity: 1, duration: .1 }, .2)
    .fromTo("#wireImg", { scale: 1.12, opacity: .2 }, { scale: 1, opacity: 1, duration: .16 }, .2)
    .to("#hud", { opacity: 1, duration: .05 }, .3)
    .to("#hud", { opacity: 0, duration: .05 }, .88)
    .to("#wireImg", { opacity: 0, duration: .08 }, .86)
    .fromTo("#realImg", { scale: 1.02 }, { scale: 1, duration: .5 }, .36)
    .to("#heroEnd", { opacity: 1, duration: .08 }, .9)
    .to({}, { duration: .02 }, .98);

  ScrollTrigger.create({
    trigger: "#hero", start: "top top", end: "bottom bottom", scrub: true,
    animation: heroTl,
    onUpdate: s => {
      const p = s.progress;
      const b = map(p, .36, .86);
      realWrap.style.clipPath = `inset(0 ${(1 - b) * 100}% 0 0)`;
      scanActive = b > 0 && b < 1;
      scan.style.opacity = scanActive ? 1 : 0;
      scanX = b * sparks.clientWidth;
      scan.style.transform = `translateX(${scanX}px)`;
      const pct = Math.round(b * 100);
      hudPct.textContent = String(pct).padStart(3, "0");
      steps.forEach((li, i) => li.classList.toggle("on", b >= i / steps.length));
    }
  });

  /* ------------------------------------------------------------------
   * 2. ÉCRAN NOIR — FICHE TECHNIQUE
   * ------------------------------------------------------------------ */
  const fmt = (v, dec) => v.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const specTl = gsap.timeline({ defaults: { ease: "none" } });
  specTl.fromTo("#specsIntro", { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .5 })
        .to("#specsIntro", { opacity: 0, scale: 1.04, duration: .4 }, "+=.4");
  $$("[data-spec]").forEach(spec => {
    const b = $("b", spec), to = parseFloat(b.dataset.to), dec = +b.dataset.dec, o = { v: 0 };
    specTl.fromTo(spec, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .4 })
          .to(o, { v: to, duration: .6, ease: "power2.out", onUpdate: () => { b.textContent = fmt(o.v, dec); } }, "<")
          .to(spec, { opacity: 0, y: -60, duration: .4 }, "+=.5");
  });
  specTl.fromTo("#specsGrid", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .5 })
        .from("#specsGrid div", { opacity: 0, y: 20, stagger: .08, duration: .3 }, "<")
        .to({}, { duration: .6 });
  ScrollTrigger.create({ trigger: "#specs", start: "top top", end: "bottom bottom", scrub: .6, animation: specTl });

  /* ------------------------------------------------------------------
   * 3. TOUR DE LA VOITURE
   * ------------------------------------------------------------------ */
  const tourWrap = $("#tourMedia");
  const tour = scrubVideo($("#tourVideo"), M.tourVideo, tourWrap);
  const callouts = $$("#tour .callout");
  const dial = $("#tourDial"), deg = $("#tourDeg");
  ScrollTrigger.create({
    trigger: "#tour", start: "top top", end: "bottom bottom",
    onUpdate: s => {
      const p = s.progress;
      tour.target = map(p, .04, .96);
      gsap.set("#tourTitle", { opacity: 1 - map(p, .03, .1), y: -map(p, 0, .1) * 40 });
      callouts.forEach(c => {
        const a = +c.dataset.from, b = +c.dataset.to;
        const o = Math.min(map(p, a, a + .04), 1 - map(p, b - .04, b));
        c.style.opacity = o;
        c.style.transform = `translateY(${(1 - o) * 16}px)`;
      });
      dial.style.strokeDashoffset = 113.1 * (1 - tour.target);
      deg.textContent = Math.round(tour.target * 180) + "°";
      if (tourWrap.classList.contains("no-video")) {
        const f = map(p, .3, .7);
        $("#tourFallbackA").style.opacity = 1 - f;
        $("#tourFallbackB").style.opacity = f;
        $("#tourFallbackA").style.transform = `scale(${1.05 + p * .1}) translateX(${-p * 4}%)`;
        $("#tourFallbackB").style.transform = `scale(${1.15 - p * .1}) translateX(${(1 - p) * 4}%)`;
      }
    }
  });

  /* ------------------------------------------------------------------
   * 4. ENTRÉE DANS L'HABITACLE + CIEL ÉTOILÉ
   * ------------------------------------------------------------------ */
  const enterWrap = $("#enterMedia");
  const enter = scrubVideo($("#enterVideo"), M.enterVideo, enterWrap);
  const interior = $("#interior"), interiorImg = $("#interiorImg");

  const sky = $("#starsky"), kctx = sky.getContext("2d");
  sizeCanvas(sky);
  const stars = Array.from({ length: 260 }, () => ({
    x: Math.random(), y: Math.pow(Math.random(), 1.8) * .42,
    r: Math.random() * 1.3 + .25, ph: Math.random() * Math.PI * 2, sp: Math.random() * 2 + .6
  }));
  let skyAlpha = 0, shooting = null;
  function drawSky(t) {
    const w = sky.clientWidth, h = sky.clientHeight;
    kctx.clearRect(0, 0, w, h);
    if (skyAlpha > .01) {
      for (const s of stars) {
        const tw = .45 + .55 * Math.sin(t * .001 * s.sp + s.ph);
        kctx.globalAlpha = skyAlpha * tw;
        const x = s.x * w, y = s.y * h, r = s.r * (.8 + tw * .6);
        const g = kctx.createRadialGradient(x, y, 0, x, y, r * 4);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(.3, "rgba(220,230,255,.6)");
        g.addColorStop(1, "rgba(220,230,255,0)");
        kctx.fillStyle = g;
        kctx.beginPath(); kctx.arc(x, y, r * 4, 0, Math.PI * 2); kctx.fill();
      }
      if (!shooting && Math.random() < .006) shooting = { x: Math.random() * w * .7, y: Math.random() * h * .2, life: 1 };
      if (shooting) {
        shooting.x += 7; shooting.y += 2.2; shooting.life -= .025;
        kctx.globalAlpha = skyAlpha * Math.max(0, shooting.life);
        const g = kctx.createLinearGradient(shooting.x - 90, shooting.y - 28, shooting.x, shooting.y);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.9)");
        kctx.strokeStyle = g; kctx.lineWidth = 1.4;
        kctx.beginPath(); kctx.moveTo(shooting.x - 90, shooting.y - 28); kctx.lineTo(shooting.x, shooting.y); kctx.stroke();
        if (shooting.life <= 0) shooting = null;
      }
      kctx.globalAlpha = 1;
    }
    requestAnimationFrame(drawSky);
  }
  requestAnimationFrame(drawSky);

  let interiorOn = false;
  window.addEventListener("pointermove", e => {
    if (!interiorOn) return;
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    gsap.to(interiorImg, { x: x * -40, y: y * -24, duration: 1.4, ease: "power3.out", overwrite: "auto" });
  });

  ScrollTrigger.create({
    trigger: "#enter", start: "top top", end: "bottom bottom",
    onUpdate: s => {
      const p = s.progress;
      enter.target = map(p, .05, .66);
      gsap.set("#enterTitle", { opacity: Math.min(map(p, 0, .04), 1 - map(p, .1, .16)) });
      const fade = map(p, .6, .72);
      interior.style.opacity = fade;
      enterWrap.style.opacity = 1 - fade;
      interiorOn = fade > .5;
      skyAlpha = map(p, .66, .8);
      gsap.set(interiorImg, { scale: 1 + map(p, .66, 1) * .06 });
      const c = map(p, .76, .84);
      gsap.set("#interiorCopy", { opacity: c, xPercent: (1 - c) * 8 });
      if (enterWrap.classList.contains("no-video")) {
        $("#enterFallbackA").style.transform = `scale(${1 + map(p, 0, .66) * .9})`;
      }
    }
  });

  /* ------------------------------------------------------------------
   * 5. UNIVERS — RÉVÉLATIONS, PARALLAXE, 360°, GALERIE
   * ------------------------------------------------------------------ */
  $$(".reveal").forEach(el => gsap.to(el, {
    opacity: 1, y: 0, duration: 1.4, ease: "expo.out",
    scrollTrigger: { trigger: el, start: "top 85%" }
  }));

  $$(".parallax img").forEach(img => gsap.fromTo(img, { yPercent: -10 }, {
    yPercent: 10, ease: "none",
    scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true }
  }));

  // Rotation au glisser (réutilise la vidéo du tour)
  const drag = $("#drag360"), dragBar = $("#dragBar");
  const dragState = scrubVideo($("#dragVideo"), M.tourVideo, drag);
  let dragging = false, startX = 0, startT = 0, idle = true;
  drag.addEventListener("pointerdown", e => { dragging = true; idle = false; startX = e.clientX; startT = dragState.target; drag.setPointerCapture(e.pointerId); });
  drag.addEventListener("pointermove", e => {
    if (!dragging) return;
    dragState.target = clamp(startT + (e.clientX - startX) / drag.clientWidth * 1.2);
  });
  ["pointerup", "pointercancel"].forEach(ev => drag.addEventListener(ev, () => { dragging = false; }));
  (function dragLoop(t) {
    if (idle) dragState.target = .5 + Math.sin(t * .0004) * .5;
    dragBar.style.width = (dragState.target * 100) + "%";
    requestAnimationFrame(dragLoop);
  })(0);

  // Galerie horizontale épinglée
  const track = $("#hTrack");
  gsap.to(track, {
    x: () => -(track.scrollWidth - innerWidth),
    ease: "none",
    scrollTrigger: { trigger: "#hscroll", start: "top top", end: () => "+=" + (track.scrollWidth - innerWidth), pin: true, scrub: 1, invalidateOnRefresh: true }
  });

  /* ------------------------------------------------------------------
   * ÉTOILE MERCEDES ERRANTE
   * ------------------------------------------------------------------ */
  const arms = $("#starArms");
  const R = 40, r = R * .16;
  const pt = (rad, a) => `${(rad * Math.cos(a)).toFixed(2)},${(rad * Math.sin(a)).toFixed(2)}`;
  let armsSvg = "";
  [-90, 30, 150].forEach(deg0 => {
    const a = deg0 * Math.PI / 180, b1 = a - Math.PI / 3, b2 = a + Math.PI / 3;
    armsSvg += `<polygon points="0,0 ${pt(R, a)} ${pt(r, b1)}" fill="#f4f5f7"/>`;
    armsSvg += `<polygon points="0,0 ${pt(R, a)} ${pt(r, b2)}" fill="#8b8f96"/>`;
  });
  arms.innerHTML = armsSvg;

  const star = $("#star");
  const S = 64;
  const st = {
    x: Math.random() * (innerWidth - S), y: Math.random() * (innerHeight - S),
    vx: 0, vy: 0, rot: 0, spin: 0, tx: 0, ty: 0, next: 0
  };
  const mouse = { x: -999, y: -999 };
  window.addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  function newTarget(t) {
    st.tx = Math.random() * (innerWidth - S);
    st.ty = 60 + Math.random() * (innerHeight - S - 60);
    st.next = t + 2500 + Math.random() * 4000;
  }
  newTarget(0);
  function wander(t) {
    if (t > st.next || Math.hypot(st.tx - st.x, st.ty - st.y) < 40) newTarget(t);
    let ax = (st.tx - st.x) * .0009, ay = (st.ty - st.y) * .0009;
    // fuit le curseur
    const cx = st.x + S / 2, cy = st.y + S / 2, dx = cx - mouse.x, dy = cy - mouse.y, d = Math.hypot(dx, dy);
    if (d < 140 && d > 0) { ax += dx / d * .9; ay += dy / d * .9; }
    ax += Math.sin(t * .0013) * .02; ay += Math.cos(t * .0011) * .02;
    st.vx = (st.vx + ax) * .965; st.vy = (st.vy + ay) * .965;
    const sp = Math.hypot(st.vx, st.vy), max = d < 140 ? 9 : 2.6;
    if (sp > max) { st.vx *= max / sp; st.vy *= max / sp; }
    st.x += st.vx; st.y += st.vy;
    if (st.x < 0 || st.x > innerWidth - S) { st.vx *= -1; st.x = clamp(st.x, 0, innerWidth - S); newTarget(t); }
    if (st.y < 0 || st.y > innerHeight - S) { st.vy *= -1; st.y = clamp(st.y, 0, innerHeight - S); newTarget(t); }
    st.spin *= .95;
    st.rot += .15 + st.vx * .6 + st.spin;
    star.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) rotate(${st.rot}deg)`;
    requestAnimationFrame(wander);
  }
  if (!reduced) requestAnimationFrame(wander);
  else star.style.transform = `translate3d(${innerWidth - 90}px, ${innerHeight - 90}px, 0)`;

  star.addEventListener("click", () => {
    st.spin = 40;
    const cx = st.x + S / 2, cy = st.y + S / 2;
    for (let i = 0; i < 14; i++) {
      const el = document.createElement("div");
      el.className = "star-burst";
      el.innerHTML = `<svg viewBox="-50 -50 100 100">${armsSvg}</svg>`;
      document.body.appendChild(el);
      const a = (i / 14) * Math.PI * 2, dist = 80 + Math.random() * 90;
      gsap.fromTo(el, { x: cx - 7, y: cy - 7, scale: 1, opacity: 1, rotation: 0 },
        { x: cx - 7 + Math.cos(a) * dist, y: cy - 7 + Math.sin(a) * dist, scale: .2, opacity: 0, rotation: 360, duration: 1.1, ease: "expo.out", onComplete: () => el.remove() });
    }
  });

  /* ------------------------------------------------------------------
   * CURSEUR
   * ------------------------------------------------------------------ */
  const cursor = $("#cursor");
  const cpos = { x: innerWidth / 2, y: innerHeight / 2 };
  (function cloop() {
    cpos.x = lerp(cpos.x, mouse.x, .2); cpos.y = lerp(cpos.y, mouse.y, .2);
    cursor.style.transform = `translate3d(${cpos.x}px, ${cpos.y}px, 0)`;
    requestAnimationFrame(cloop);
  })();
  $$("a, button, .drag360, .card").forEach(el => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
  });

  window.addEventListener("resize", () => { sizeCanvas(sparks); sizeCanvas(sky); });
})();
