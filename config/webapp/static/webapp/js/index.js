const app = window.Telegram.WebApp;

try { 
    app.ready();
    app.expand();
} catch {}

// Simple page loader hide logic: fade the overlay after window load
(function () {
    function hideLoader() {
        try {
            const loader = document.getElementById('page-loader');
            if (!loader) return;
            loader.classList.add('hidden');
            // remove from DOM after transition to keep things clean
            setTimeout(() => {
                if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
            }, 420);
        } catch (e) { /**/ }
    }
    // Hide on full window load (images/fonts ready)
    window.addEventListener('load', hideLoader);
    // Also attempt to hide a bit after DOMContentLoaded in case load already fired
    document.addEventListener('DOMContentLoaded', () => setTimeout(hideLoader, 300));
})();

// try { 
//     app.requestFullscreen().catch(() => {
//         console.log("Не получилось включить fullscreen (клиент не поддерживает)");
//     });
// } catch {}



(function () {
    const playBtn = document.querySelector('.player-btn.play-pause');
    const prevBtn = document.querySelector('.player-btn.prev');
    const nextBtn = document.querySelector('.player-btn.next');
    const progress = document.querySelector('.main__progress');
    const titleEl = document.querySelector('.main__track-title');
    const artistEl = document.querySelector('.main__track-artist');
    const downloadBtn = document.querySelector('.main__download-btn');
    const audio = document.getElementById('audio-player');
    const coverEl = document.querySelector('.main__coverart');

    if (!playBtn || !audio) return;

    // Build playlist: first_track (from template context) first, then tracks (skip duplicate by id)
    let playlist = [];
    try {
        if (typeof first_track !== 'undefined' && first_track) playlist.push(first_track);
    } catch (e) {
        // first_track might not be exposed to JS; audio[data-first-src] still contains URL
    }
    if (Array.isArray(tracks)) {
        tracks.forEach(t => {
            if (playlist.length && playlist[0] && playlist[0].id && t.id && playlist[0].id === t.id) return;
            playlist.push(t);
        });
    }

    // If playlist empty but audio has data-first-src, create an entry
    if (playlist.length === 0) {
        const firstUrl = audio.getAttribute('data-first-src') || audio.src || '';
        if (firstUrl) playlist.push({ id: 'first', name: '', performers: '', preview_url: firstUrl });
    }

    let currentIndex = 0; // index in playlist

    function updateUIForIndex() {
    const t = playlist[currentIndex] || {};
    if (titleEl) titleEl.textContent = t.name || t.title || '';
    if (artistEl) artistEl.textContent = t.performers || t.performer || t.artist || '';
        // update cover art (use data-default fallback if provided)
        if (coverEl) {
            const defaultSrc = coverEl.getAttribute('data-default') || coverEl.src || '';
            const newSrc = t.coverart || defaultSrc;
            coverEl.src = newSrc;
            // update body background based on cover art (use id or url as fallback seed)
            applyBodyBackgroundFromImageUrl(newSrc, t.id || t.preview_url || newSrc);
        }
        const url = t.preview_url || t.url || '';
        if (downloadBtn) {
            if (url) {
                // Instead of linking directly to the preview, point users to the
                // Telegram bot with the start parameter containing the track id.
                // Example: https://t.me/AusensBot?start=sp_<id>
                try {
                    const botUser = 'AusensBot';
                    const startParam = t.id ? `sp_${String(t.id)}` : '';
                    const botHref = startParam ? `https://t.me/${encodeURIComponent(botUser)}?start=${encodeURIComponent(startParam)}` : '';
                    if (botHref) {
                        downloadBtn.href = botHref;
                        // open in new tab/window for better UX inside webviews
                        downloadBtn.setAttribute('target', '_blank');
                        downloadBtn.removeAttribute('download');
                        downloadBtn.removeAttribute('aria-disabled');
                    } else {
                        downloadBtn.removeAttribute('href');
                        downloadBtn.setAttribute('aria-disabled', 'true');
                    }
                } catch (err) {
                    // fallback to preview url if anything goes wrong
                    downloadBtn.href = url;
                    downloadBtn.removeAttribute('aria-disabled');
                }
            } else {
                downloadBtn.removeAttribute('href');
                downloadBtn.setAttribute('aria-disabled', 'true');
            }
        }
        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
            prevBtn.setAttribute('aria-disabled', String(prevBtn.disabled));
        }
        if (nextBtn) {
            nextBtn.disabled = currentIndex >= playlist.length - 1;
            nextBtn.setAttribute('aria-disabled', String(nextBtn.disabled));
        }
    }

    // Marquee removed — titles will be simple wrapped text

    // Marquee-related resize/observers removed — wrapped text will reflow naturally

    // --- Background color extraction from cover art ---
    // Try to extract an average color from the cover image. If CORS prevents reading pixels,
    // fall back to a deterministic color derived from the track id or URL.
    function colorFromStringFallback(s) {
        // simple hash to hue
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = (h * 31 + s.charCodeAt(i)) % 360;
        }
        // return HSL string with medium saturation and darkish lightness
        return `hsl(${h}, 65%, 18%)`;
    }

    function applyBodyBackgroundFromImageUrl(url, fallbackSeed) {
        if (!url) {
            document.body.style.background = '';
            return;
        }

        const img = new Image();
        // attempt CORS-enabled fetch for canvas reading
        img.crossOrigin = 'Anonymous';
        img.src = url;

        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                const size = 32; // small for speed
                c.width = size;
                c.height = size;
                const ctx = c.getContext('2d');
                // draw covering the canvas
                ctx.drawImage(img, 0, 0, size, size);
                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    if (alpha === 0) continue;
                    const rr = data[i], gg = data[i + 1], bb = data[i + 2];
                    // ignore very bright pixels (likely white background)
                    if (rr > 250 && gg > 250 && bb > 250) continue;
                    r += rr; g += gg; b += bb; count++;
                }
                if (count === 0) throw new Error('no pixels');
                r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
                // make a darker variant for background gradient
                const darkFactor = 0.28;
                const r2 = Math.max(0, Math.round(r * darkFactor));
                const g2 = Math.max(0, Math.round(g * darkFactor));
                const b2 = Math.max(0, Math.round(b * darkFactor));
                // apply a gentle gradient from semi-transparent color to dark
                document.body.style.background = `linear-gradient(180deg, rgba(${r},${g},${b},0.16), rgb(${r2},${g2},${b2}))`;
            } catch (err) {
                // CORS or other error — fallback to hashed color
                document.body.style.background = colorFromStringFallback(fallbackSeed || url);
            }
        };

        img.onerror = () => {
            document.body.style.background = colorFromStringFallback(fallbackSeed || url);
        };
    }

    function setAudioSrcIfNeeded(url) {
        if (!url) return;
        if (!audio.src || audio.src !== url) {
            audio.src = url;
        }
    }

    function playIndex(idx) {
        if (idx < 0 || idx >= playlist.length) return;
        currentIndex = idx;
        const t = playlist[currentIndex] || {};
        const url = t.preview_url || t.url || audio.getAttribute('data-first-src') || '';
        setAudioSrcIfNeeded(url);
        updateUIForIndex();
        audio.play().then(() => {
            playBtn.classList.add('is-playing');
        }).catch(err => {
            console.warn('Play failed', err);
            playBtn.classList.remove('is-playing');
        });
    }

    function pause() {
        audio.pause();
        playBtn.classList.remove('is-playing');
    }

    // Initialize UI with first track info (but do NOT load audio yet)
    updateUIForIndex();

    // Play/pause toggle
    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            const t = playlist[currentIndex] || {};
            const url = t.preview_url || t.url || audio.getAttribute('data-first-src') || '';
            setAudioSrcIfNeeded(url);
            audio.play().then(() => playBtn.classList.add('is-playing')).catch(err => console.warn(err));
        } else {
            pause();
        }
    });

    // Keyboard shortcuts and external control helpers
    function onNextRequested() {
        if (currentIndex < playlist.length - 1) playIndex(currentIndex + 1);
    }
    function onPrevRequested() {
        if (currentIndex > 0) playIndex(currentIndex - 1);
    }
    function onToggleRequested() {
        if (audio.paused) playBtn.click(); else pause();
    }

    // expose simple controls to window so external menus or integrations can call them
    window.playerNext = onNextRequested;
    window.playerPrev = onPrevRequested;
    window.playerToggle = onToggleRequested;

    document.addEventListener('keydown', (e) => {
        // Ignore keystrokes when the user is typing in text-like controls, but
        // allow media keys even if a non-text input (like the range) is focused.
        const target = e.target;
        const tag = (target && target.tagName) || '';
        const type = (target && target.type) ? String(target.type).toLowerCase() : '';

        const isTextInput = (
            tag === 'TEXTAREA' ||
            (tag === 'INPUT' && ['text', 'search', 'email', 'password', 'tel', 'url', 'number'].includes(type)) ||
            (target && target.isContentEditable)
        );
        if (isTextInput) return;

        const code = e.code || '';
        const key = e.key || '';

        // Space toggles play/pause — handle by code or key
        if (code === 'Space' || key === ' ') {
            e.preventDefault();
            onToggleRequested();
            return;
        }

        // Arrow keys: accept multiple variants (older browsers may use different key values)
        if (code === 'ArrowRight' || key === 'ArrowRight' || key === 'Right') {
            // If an input like the range is focused, allow arrows to control playback
            e.preventDefault();
            onNextRequested();
            return;
        }
        if (code === 'ArrowLeft' || key === 'ArrowLeft' || key === 'Left') {
            e.preventDefault();
            onPrevRequested();
            return;
        }

        // optional single-key shortcuts
        if (key === 'k') { e.preventDefault(); onToggleRequested(); }
        if (key === 'n') { e.preventDefault(); onNextRequested(); }
        if (key === 'p') { e.preventDefault(); onPrevRequested(); }
    });

    // Prev/next with boundary behavior (do nothing at bounds)
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentIndex === 0) return;
            playIndex(currentIndex - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentIndex >= playlist.length - 1) return;
            playIndex(currentIndex + 1);
        });
    }

    // Progress bar wiring
    if (progress) {
        // helper to style filled portion as smooth white gradient
        function updateProgressStyle() {
            const dur = audio.duration || 0;
            const cur = audio.currentTime || 0;
            const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
            // use brand green for the filled portion to match buttons
            progress.style.background = `linear-gradient(90deg, #1DB954 ${pct}%, rgba(255,255,255,0.12) ${pct}%)`;
        }

        audio.addEventListener('loadedmetadata', () => {
            const dur = audio.duration || 0;
            progress.max = dur > 0 ? dur : 0;
            progress.value = audio.currentTime || 0;
            updateProgressStyle();
        });

        audio.addEventListener('timeupdate', () => {
            if (!isNaN(audio.duration) && audio.duration > 0) {
                progress.value = audio.currentTime || 0;
                updateProgressStyle();
            }
        });

        let isSeeking = false;
        progress.addEventListener('input', (e) => {
            isSeeking = true;
            const v = Number(e.target.value);
            if (!isNaN(v)) {
                audio.currentTime = v;
                updateProgressStyle();
            }
        });
        progress.addEventListener('change', () => { isSeeking = false; });
    }

    audio.addEventListener('play', () => playBtn.classList.add('is-playing'));
    audio.addEventListener('pause', () => playBtn.classList.remove('is-playing'));
    audio.addEventListener('ended', () => {
        playBtn.classList.remove('is-playing');
        if (currentIndex < playlist.length - 1) {
            playIndex(currentIndex + 1);
        }
    });

    if (downloadBtn) {
        // Toast helper: show a short notification that the bot download started
        let _toastTimer = null;
        function showDownloadToast(message = 'Download started in the Telegram bot') {
            try {
                let toast = document.querySelector('.download-toast');
                if (!toast) {
                    toast = document.createElement('div');
                    toast.className = 'download-toast';
                    toast.innerHTML = `<div class="download-toast__inner">${message}</div>`;
                    document.body.appendChild(toast);
                    // trigger appear
                    requestAnimationFrame(() => toast.classList.add('visible'));
                } else {
                    toast.querySelector('.download-toast__inner').textContent = message;
                    toast.classList.add('visible');
                }
                clearTimeout(_toastTimer);
                _toastTimer = setTimeout(() => {
                    toast.classList.remove('visible');
                    setTimeout(() => { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); }, 320);
                }, 2200);
            } catch (err) { /* ignore */ }
        }

        downloadBtn.addEventListener('click', (e) => {
            const href = downloadBtn.href;
            if (!href) return;

            // Show a brief notification so the user knows the bot will handle the download
            showDownloadToast();

            // Open the bot link in a new tab after a short delay to allow the toast to appear
            setTimeout(() => {
                try {
                    window.open(href, '_blank', 'noopener');
                } catch (err) {
                    window.location.href = href;
                }
            }, 420);

            e.preventDefault();
        });
    }

    updateUIForIndex();
})();
