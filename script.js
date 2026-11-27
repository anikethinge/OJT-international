const slides = gsap.utils.toArray(".slide");
const total = slides.length;
let currentIndex = 0;
const bodyEl = document.body;

const leftCard = document.getElementById("leftCard");
const rightCard = document.getElementById("rightCard");

// Initial slide visibility setup
slides.forEach((slide, i) => {
  gsap.set(slide, {
    yPercent: i === 0 ? 0 : -35,
    autoAlpha: i === 0 ? 1 : 0,
    scale: i === 0 ? 1 : 0.95,
    zIndex: i === 0 ? 2 : 1,
    pointerEvents: i === 0 ? "auto" : "none"
  });
});

gsap.set([leftCard, rightCard], { autoAlpha: 0 });

let isCrmActiveState = false;

function updateThemeAndBackground(index) {
  if (index === 3) {
    bodyEl.classList.add("crm-active");
    isCrmActiveState = true; // Switches canvas engine to Interactive Fluid Mesh mode

    gsap.fromTo(leftCard, 
      { y: -70, autoAlpha: 0, scale: 0.9 }, 
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "power3.out", delay: 0.1 }
    );

    gsap.fromTo(rightCard, 
      { y: 70, autoAlpha: 0, scale: 0.9 }, 
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "power3.out", delay: 0.1 }
    );
  } else {
    bodyEl.classList.remove("crm-active");
    isCrmActiveState = false; // Switches canvas back to Moving Starfield + Shooting Stars mode
    gsap.set([leftCard, rightCard], { autoAlpha: 0 });
  }
}

function goToSlide(direction) {
  const prevSlide = slides[currentIndex];
  currentIndex = (currentIndex + direction + total) % total;
  const nextSlide = slides[currentIndex];

  updateThemeAndBackground(currentIndex);
  gsap.killTweensOf(slides);

  slides.forEach((slide) => {
    if (slide !== prevSlide && slide !== nextSlide) {
      gsap.set(slide, { autoAlpha: 0, zIndex: 1, pointerEvents: "none" });
    }
  });

  gsap.to(prevSlide, {
    yPercent: direction > 0 ? 35 : -35,
    autoAlpha: 0,
    scale: 0.95,
    zIndex: 1,
    pointerEvents: "none",
    duration: 0.22,
    ease: "power2.out"
  });

  gsap.fromTo(
    nextSlide,
    {
      yPercent: direction > 0 ? -35 : 35,
      autoAlpha: 0,
      scale: 0.95,
      zIndex: 2,
      pointerEvents: "auto"
    },
    {
      yPercent: 0,
      autoAlpha: 1,
      scale: 1,
      duration: 0.26,
      ease: "power3.out"
    }
  );
}

// 1-Swipe = 1-Slide State Machine
let gestureLocked = false;
let isDecaying = false;
let minDeltaDuringDecay = Infinity;
let lastDelta = 0;
let lastDirection = 0;
let wheelIdleTimer = null;

window.addEventListener("wheel", (e) => {
  e.preventDefault();
  const absDelta = Math.abs(e.deltaY);
  const dir = Math.sign(e.deltaY);
  if (absDelta < 2) return;

  clearTimeout(wheelIdleTimer);
  wheelIdleTimer = setTimeout(() => {
    gestureLocked = false;
    isDecaying = false;
    minDeltaDuringDecay = Infinity;
    lastDelta = 0;
  }, 60);

  if (!gestureLocked) {
    goToSlide(dir);
    gestureLocked = true;
    isDecaying = false;
    minDeltaDuringDecay = Infinity;
    lastDirection = dir;
    lastDelta = absDelta;
    return;
  }

  if (dir !== lastDirection) {
    gestureLocked = false;
    goToSlide(dir);
    gestureLocked = true;
    isDecaying = false;
    minDeltaDuringDecay = Infinity;
    lastDirection = dir;
    lastDelta = absDelta;
    return;
  }

  if (absDelta < lastDelta) {
    isDecaying = true;
    if (absDelta < minDeltaDuringDecay) minDeltaDuringDecay = absDelta;
  }

  if (isDecaying && absDelta > minDeltaDuringDecay * 1.8 && absDelta > minDeltaDuringDecay + 12) {
    goToSlide(dir);
    isDecaying = false;
    minDeltaDuringDecay = Infinity;
  }

  lastDelta = absDelta;
}, { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "PageDown") goToSlide(1);
  if (e.key === "ArrowUp" || e.key === "PageUp") goToSlide(-1);
});

// --- CURSOR-TRACKING BLUE SPOTLIGHT GLOW ---
const glow = document.querySelector('.bg-glow');
window.addEventListener('mousemove', (e) => {
  gsap.to(glow, {
    x: e.clientX,
    y: e.clientY,
    duration: 1.2,
    ease: "power2.out"
  });
});

// --- HYBRID CANVAS ENGINE (Galaxy Starfield & Shooting Stars <-> Interactive Fluid Mesh) ---
const canvas = document.getElementById("effectCanvas");
const ctx = canvas.getContext("2d");

let width, height;
let stars = [];
let shootingStars = [];
let particles = [];

const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  targetX: window.innerWidth / 2,
  targetY: window.innerHeight / 2,
  radius: 150
};

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initGrid();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Populate Drifting Galaxy Stars
const starCount = 180;
for (let i = 0; i < starCount; i++) {
  stars.push({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.8 + 0.4,
    baseAlpha: Math.random() * 0.8 + 0.2,
    speed: Math.random() * 0.7 + 0.3
  });
}

function spawnShootingStar() {
  if (shootingStars.length < 3 && Math.random() < 0.03) {
    shootingStars.push({
      x: Math.random() * width + width * 0.2,
      y: -50,
      length: Math.random() * 120 + 60,
      speed: Math.random() * 12 + 8,
      opacity: 1
    });
  }
}

// Interactive Fluid Node Class for Slide 4
class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.vx = 0;
    this.vy = 0;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    let dx = mouse.x - this.x;
    let dy = mouse.y - this.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < mouse.radius) {
      let force = (mouse.radius - distance) / mouse.radius;
      let angle = Math.atan2(dy, dx);
      this.vx -= Math.cos(angle) * force * 5;
      this.vy -= Math.sin(angle) * force * 5;
    }

    let homeDx = this.baseX - this.x;
    let homeDy = this.baseY - this.y;
    this.vx += homeDx * 0.05;
    this.vy += homeDy * 0.05;

    this.vx *= 0.85;
    this.vy *= 0.85;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initGrid() {
  particles = [];
  const spacing = 45; 
  for (let x = 0; x < width + spacing; x += spacing) {
    for (let y = 0; y < height + spacing; y += spacing) {
      particles.push(new Node(x, y));
    }
  }
}

window.addEventListener("mousemove", (e) => {
  mouse.targetX = e.clientX;
  mouse.targetY = e.clientY;
});

function animateBackground() {
  mouse.x += (mouse.targetX - mouse.x) * 0.1;
  mouse.y += (mouse.targetY - mouse.y) * 0.1;

  if (!isCrmActiveState) {
    // --- MODE 1: MOVING GALAXY STARFIELD + SHOOTING STARS (Slides 1-3) ---
    ctx.fillStyle = '#040508';
    ctx.fillRect(0, 0, width, height);

    stars.forEach((star) => {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.baseAlpha})`;
      ctx.fill();
    });

    spawnShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      let ss = shootingStars[i];
      ss.x -= ss.speed * 0.6;
      ss.y += ss.speed;
      ss.opacity -= 0.02;

      ctx.strokeStyle = `rgba(186, 230, 253, ${ss.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.length * 0.6, ss.y - ss.length);
      ctx.stroke();

      if (ss.opacity <= 0 || ss.y > height) {
        shootingStars.splice(i, 1);
      }
    }
  } else {
    // --- MODE 2: INTERACTIVE BLUE FLUID MESH (Slide 4 - Slime CRM) ---
    ctx.fillStyle = 'rgba(3, 7, 18, 0.25)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(37, 99, 235, 0.18)';
    ctx.lineWidth = 1;

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      for (let j = i + 1; j < particles.length; j++) {
        let p2 = particles[j];
        let dx = particles[i].x - p2.x;
        let dy = particles[i].y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 60) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  requestAnimationFrame(animateBackground);
}
animateBackground();

// --- SEARCH BAR ANIMATION ---
const searchBtn = document.getElementById("searchBtn");
const searchInputPill = document.getElementById("searchInputPill");
const searchInput = document.getElementById("searchInput");
const closeSearchBtn = document.getElementById("closeSearchBtn");
let isSearchOpen = false;

searchBtn.addEventListener("click", () => {
  if (isSearchOpen) return;
  isSearchOpen = true;
  gsap.to(searchInputPill, {
    width: "240px",
    padding: "0 1.25rem",
    opacity: 1,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    duration: 0.45,
    ease: "power3.inOut",
    onComplete: () => searchInput.focus()
  });
});

closeSearchBtn.addEventListener("click", () => {
  if (!isSearchOpen) return;
  isSearchOpen = false;
  gsap.to(searchInputPill, {
    width: "0px",
    padding: "0 0rem",
    opacity: 0,
    border: "1px solid rgba(255, 255, 255, 0)",
    duration: 0.4,
    ease: "power3.inOut"
  });
});
