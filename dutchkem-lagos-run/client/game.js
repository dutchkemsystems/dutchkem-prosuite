/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* ============================================================================
 * Dutchkem Ventures Presents: Lagos Run — Hustle Empire
 * Client game engine — Phase 4
 *
 * Sections:
 *   1.  CONFIG
 *   2.  Utilities
 *   3.  Store
 *   4.  Save
 *   5.  Haptics
 *   6.  Audio
 *   7.  Ads
 *   8.  API
 *   9.  Analytics
 *   10. UI
 *   11. Weather
 *   12. Radio
 *   13. Game
 *   14. Bootstrap
 *
 * No external dependencies. Canvas 2D, 60fps target on mid-range Android.
 * © 2026 Dutchkem Ventures. All rights reserved.
 * ========================================================================== */

(function () {
  'use strict';

  /* ==========================================================================
   * 1. CONFIG
   * ======================================================================== */

  var ENV = window.DUTCHKEM_CONFIG || {};

  var CONFIG = {
    version: ENV.APP_VERSION || '1.0.0',
    apiBase: String(ENV.API_BASE_URL || '').replace(/\/+$/, ''),
    ads: {
      rewardedId: ENV.ADMOB_REWARDED_ID || '',
      interstitialId: ENV.ADMOB_INTERSTITIAL_ID || '',
      interstitialEveryRuns: 3,
      maxRewardedPerDay: 5
    },
    world: {
      laneCount: 3,
      roadWidthRatio: 0.78,
      baseSpeed: 260,
      maxSpeed: 620,
      speedRampPerSec: 3.2,
      spawnAheadPx: 900
    },
    economy: {
      farePerPassenger: 120,
      smoothBonusMax: 80,
      reputationStart: 60,
      reputationMax: 100,
      dailyRewardCoins: [100, 150, 200, 250, 300, 400, 800],
      comebackMultiplier: 2,
      offlineCapHours: 8
    },
    anticheat: {
      maxScorePerRun: 500000,
      minHumanReactionMs: 150
    },
    storageKey: 'dutchkem_lagosrun_v1'
  };

  var LEGACY_CONSENT_KEY = 'dutchkem_consent';

  /* ==========================================================================
   * 2. Utilities
   * ======================================================================== */

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function now() {
    return Date.now();
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function todayKey(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function hexToRgb(hex) {
    var value = String(hex || '').replace('#', '');
    if (value.length === 3) {
      value = value.charAt(0) + value.charAt(0) +
        value.charAt(1) + value.charAt(1) +
        value.charAt(2) + value.charAt(2);
    }
    var num = parseInt(value, 16);
    if (isNaN(num)) return { r: 0, g: 0, b: 0 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  function fmt(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function setHtml(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function uid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        return Array.prototype.map.call(bytes, function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      }
    } catch (e) { /* fall through */ }
    return 'dk-' + now().toString(36) + '-' + randInt(100000, 999999).toString(36);
  }

  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function boxesOverlap(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function collides(a, b) {
    return boxesOverlap(a, b);
  }

  function circleRect(cx, cy, radius, rect) {
    var nx = clamp(cx, rect.x, rect.x + rect.w);
    var ny = clamp(cy, rect.y, rect.y + rect.h);
    var dx = cx - nx;
    var dy = cy - ny;
    return dx * dx + dy * dy <= radius * radius;
  }

  /* ==========================================================================
   * 3. Store — safe localStorage wrapper (Safari private mode tolerant)
   * ======================================================================== */

  var Store = {
    get: function (key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    },
    readJSON: function (key) {
      try {
        var raw = this.get(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },
    writeJSON: function (key, value) {
      try {
        return this.set(key, JSON.stringify(value));
      } catch (e) {
        return false;
      }
    }
  };

  /* ==========================================================================
   * 4. Save
   * ======================================================================== */

  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object') return target;
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value) &&
          target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        mergeDeep(target[key], value);
      } else if (value !== undefined) {
        target[key] = value;
      }
    });
    return target;
  }

  var Save = {
    data: null,
    loadedSeen: 0,

    defaults: function () {
      return {
        uid: uid(),
        coins: 0,
        kobo: 0,
        highScore: 0,
        totalRuns: 0,
        reputation: CONFIG.economy.reputationStart,
        consent: { analytics: false, ads: false, ts: 0 },
        settings: {
          colorblind: false,
          reducedMotion: false,
          sound: true,
          haptics: true,
          speed: 1
        },
        daily: { date: todayKey(), streak: 0, claimed: false },
        rewards: { date: todayKey(), count: 0 },
        lastSeen: now(),
        fleet: [],
        subscription: { tier: 'free', renewsAt: 0 },
        purchases: [],
        adFreeUntil: 0,
        comebackUntil: 0
      };
    },

    load: function () {
      var stored = Store.readJSON(CONFIG.storageKey);
      var data = this.defaults();

      if (stored && typeof stored === 'object') {
        mergeDeep(data, stored);
      } else {
        // Adopt the cookie-style consent written by /consent.html, if present.
        var legacy = Store.readJSON(LEGACY_CONSENT_KEY);
        if (legacy) {
          data.consent = {
            analytics: !!legacy.analytics,
            ads: !!legacy.ads,
            ts: legacy.ts || now()
          };
        }
      }

      data.uid = data.uid || uid();
      data.fleet = Array.isArray(data.fleet) ? data.fleet : [];
      data.purchases = Array.isArray(data.purchases) ? data.purchases : [];
      data.settings = data.settings || this.defaults().settings;
      data.daily = data.daily || { date: todayKey(), streak: 0, claimed: false };
      data.rewards = data.rewards || { date: todayKey(), count: 0 };

      // Daily rewarded counter resets on a new calendar day.
      if (data.rewards.date !== todayKey() || typeof data.rewards.count !== 'number') {
        data.rewards = { date: todayKey(), count: 0 };
      }

      data.rewards.count = clamp(Math.round(data.rewards.count) || 0, 0, CONFIG.ads.maxRewardedPerDay);
      data.coins = Math.max(0, Math.round(data.coins) || 0);
      data.kobo = Math.max(0, Math.round(data.kobo) || 0);
      data.reputation = clamp(Number(data.reputation) || CONFIG.economy.reputationStart, 0, CONFIG.economy.reputationMax);

      this.loadedSeen = Number(data.lastSeen) || 0;
      data.lastSeen = now();

      this.data = data;
      this.save();
      return this.data;
    },

    save: function () {
      if (!this.data) return false;
      return Store.writeJSON(CONFIG.storageKey, this.data);
    }
  };

  /* ==========================================================================
   * 5. Haptics
   * ======================================================================== */

  var Haptics = {
    pulse: function (ms) {
      try {
        if (!Save.data || !Save.data.settings.haptics) return;
        if (typeof navigator.vibrate !== 'function') return;
        navigator.vibrate(ms || 12);
      } catch (e) { /* vibration unsupported */ }
    }
  };

  /* ==========================================================================
   * 6. Audio — procedural Web Audio, no assets
   * ======================================================================== */

  var Audio = {
    ctx: null,
    enabled: true,

    init: function () {
      if (this.ctx) return this.ctx;
      try {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      } catch (e) {
        this.ctx = null;
      }
      return this.ctx;
    },

    resume: function () {
      try {
        if (this.ctx && this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
          this.ctx.resume();
        }
      } catch (e) { /* ignore */ }
    },

    on: function () {
      return this.enabled && (!Save.data || Save.data.settings.sound !== false);
    },

    beep: function (freq, dur, type, gain) {
      if (!this.on()) return;
      var ctx = this.init();
      if (!ctx) return;
      try {
        var osc = ctx.createOscillator();
        var vol = ctx.createGain();
        var length = dur || 0.12;
        osc.type = type || 'sine';
        osc.frequency.value = freq || 440;
        vol.gain.value = gain == null ? 0.06 : gain;
        vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + length);
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + length + 0.02);
      } catch (e) { /* audio graph failure */ }
    },

    pickup: function () {
      var self = this;
      this.beep(660, 0.08, 'square', 0.05);
      setTimeout(function () { self.beep(880, 0.1, 'square', 0.045); }, 70);
    },

    dropoff: function () {
      var self = this;
      this.beep(523, 0.1, 'sine', 0.06);
      setTimeout(function () { self.beep(659, 0.1, 'sine', 0.06); }, 90);
      setTimeout(function () { self.beep(784, 0.16, 'sine', 0.06); }, 180);
    },

    crash: function () {
      this.beep(90, 0.28, 'sawtooth', 0.09);
      this.beep(140, 0.18, 'square', 0.05);
    },

    reward: function () {
      var self = this;
      this.beep(784, 0.09, 'triangle', 0.06);
      setTimeout(function () { self.beep(988, 0.09, 'triangle', 0.06); }, 90);
      setTimeout(function () { self.beep(1175, 0.18, 'triangle', 0.06); }, 180);
    },

    coin: function () {
      this.beep(1320, 0.06, 'square', 0.04);
      this.beep(1760, 0.08, 'square', 0.035);
    }
  };

  /* ==========================================================================
   * 7. Ads — AdMob / GPT / mock router
   * ======================================================================== */

  var Ads = {
    rewardedLeft: function () {
      if (!Save.data) return CONFIG.ads.maxRewardedPerDay;
      var rewards = Save.data.rewards || { date: todayKey(), count: 0 };
      if (rewards.date !== todayKey()) return CONFIG.ads.maxRewardedPerDay;
      return Math.max(0, CONFIG.ads.maxRewardedPerDay - (rewards.count || 0));
    },

    canWatchRewarded: function () {
      return this.rewardedLeft() > 0;
    },

    _getSsvNonce: function () {
      return API.getSsvNonce().then(function (res) {
        if (res && res.nonce) return res.nonce;
        return 'local-' + now() + '-' + randInt(100000, 999999);
      }, function () {
        return 'local-' + now() + '-' + randInt(100000, 999999);
      });
    },

    showRewarded: function (reason) {
      var self = this;

      if (!this.canWatchRewarded()) {
        UI.toast('No rewarded ads left today. Come back tomorrow.');
        return Promise.resolve(false);
      }

      return this._getSsvNonce().then(function (nonce) {
        return self._showRewardedAd(reason).then(function (watched) {
          if (!watched) return false;

          // A new calendar day must restart the counter, not add to yesterday's.
          var rewards = Save.data.rewards || (Save.data.rewards = { date: todayKey(), count: 0 });
          if (rewards.date !== todayKey()) {
            rewards.date = todayKey();
            rewards.count = 0;
          }
          rewards.count = (rewards.count || 0) + 1;
          Save.save();

          Audio.reward();
          Analytics.track('ad_rewarded', { reason: reason || 'unknown', nonce: nonce });

          // Server-side verification is fire-and-forget; never block gameplay.
          try { API.claimReward(nonce); } catch (e) { /* ignore */ }

          return true;
        });
      });
    },

    showInterstitial: function () {
      var adFreeUntil = (Save.data && Save.data.adFreeUntil) || 0;
      if (adFreeUntil > now()) return Promise.resolve(false);

      var runs = (Save.data && Save.data.totalRuns) || 0;
      var every = Math.max(1, CONFIG.ads.interstitialEveryRuns || 3);
      if (runs % every !== 0) return Promise.resolve(false);

      return this._showInterstitialAd();
    },

    _showRewardedAd: function (reason) {
      var ad = window.admob;
      if (ad && (ad.RewardAd || typeof ad.showRewardVideoAd === 'function')) {
        return this._admobRewarded(reason);
      }
      if (window.googletag) {
        return this._gptRewarded(reason);
      }
      return this._mockAd(2000);
    },

    _showInterstitialAd: function () {
      var ad = window.admob;
      if (ad && (ad.InterstitialAd || typeof ad.showInterstitial === 'function')) {
        return this._admobInterstitial();
      }
      if (window.googletag) {
        return this._gptInterstitial();
      }
      return this._mockAd(1500);
    },

    _admobRewarded: function () {
      var ad = window.admob;
      var adId = CONFIG.ads.rewardedId;
      try {
        if (typeof ad.showRewardVideoAd === 'function') {
          return Promise.resolve(ad.showRewardVideoAd({ adId: adId })).then(function () {
            return true;
          }, function () {
            return false;
          });
        }
        if (ad.RewardAd && typeof ad.RewardAd.show === 'function') {
          return Promise.resolve(ad.RewardAd.show({ adId: adId })).then(function () {
            return true;
          }, function () {
            return false;
          });
        }
        if (ad.RewardAd && typeof ad.RewardAd.load === 'function') {
          return Promise.resolve(ad.RewardAd.load({ adId: adId })).then(function () {
            return ad.RewardAd.show();
          }).then(function () {
            return true;
          }, function () {
            return false;
          });
        }
      } catch (e) { /* fall through */ }
      return Promise.resolve(false);
    },

    _admobInterstitial: function () {
      var ad = window.admob;
      var adId = CONFIG.ads.interstitialId;
      try {
        if (typeof ad.showInterstitial === 'function') {
          return Promise.resolve(ad.showInterstitial({ adId: adId })).then(function () {
            return true;
          }, function () {
            return false;
          });
        }
        if (ad.InterstitialAd && typeof ad.InterstitialAd.show === 'function') {
          return Promise.resolve(ad.InterstitialAd.show({ adId: adId })).then(function () {
            return true;
          }, function () {
            return false;
          });
        }
        if (ad.InterstitialAd && typeof ad.InterstitialAd.load === 'function') {
          return Promise.resolve(ad.InterstitialAd.load({ adId: adId })).then(function () {
            return ad.InterstitialAd.show();
          }).then(function () {
            return true;
          }, function () {
            return false;
          });
        }
      } catch (e) { /* fall through */ }
      return Promise.resolve(false);
    },

    _gptRewarded: function () {
      var self = this;
      return new Promise(function (resolve) {
        var finished = false;
        function finish(value) {
          if (finished) return;
          finished = true;
          resolve(value);
        }

        try {
          if (!window.googletag || !googletag.cmd) {
            self._mockAd(2000).then(finish);
            return;
          }

          googletag.cmd.push(function () {
            try {
              var pubads = googletag.pubads();
              pubads.addEventListener('rewardedSlotGranted', function () { finish(true); });
              pubads.addEventListener('rewardedSlotClosed', function () { finish(false); });

              if (typeof pubads.enableRewardedAds === 'function') {
                pubads.enableRewardedAds('reward');
              }

              var slot = googletag.defineOutOfPageSlot(
                CONFIG.ads.rewardedId,
                googletag.enums.OutOfPageFormat.REWARDED
              );
              if (!slot) {
                finish(false);
                return;
              }
              slot.addService(pubads);
              googletag.display(slot);
            } catch (e) {
              finish(false);
            }
          });

          setTimeout(function () { finish(false); }, 20000);
        } catch (e) {
          finish(false);
        }
      });
    },

    _gptInterstitial: function () {
      var self = this;
      return new Promise(function (resolve) {
        var finished = false;
        function finish(value) {
          if (finished) return;
          finished = true;
          resolve(value);
        }

        try {
          if (!window.googletag || !googletag.cmd) {
            self._mockAd(1500).then(finish);
            return;
          }

          googletag.cmd.push(function () {
            try {
              var pubads = googletag.pubads();
              var slot = googletag.defineOutOfPageSlot(
                CONFIG.ads.interstitialId,
                googletag.enums.OutOfPageFormat.INTERSTITIAL
              );
              if (!slot) {
                finish(false);
                return;
              }
              slot.addService(pubads);
              googletag.display(slot);
              setTimeout(function () { finish(true); }, 2500);
            } catch (e) {
              finish(false);
            }
          });

          setTimeout(function () { finish(false); }, 12000);
        } catch (e) {
          finish(false);
        }
      });
    },

    _mockAd: function (ms) {
      var wait = ms || 1500;
      UI.toast('Ad preview (' + Math.round(wait / 1000) + 's) — no ad network attached.');
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(true); }, wait);
      });
    }
  };

  /* ==========================================================================
   * 8. API
   * ======================================================================== */

  var API = {
    token: null,

    request: function (path, opts) {
      opts = opts || {};

      var url = CONFIG.apiBase + path;
      var headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (this.token) headers.Authorization = 'Bearer ' + this.token;

      var body;
      if (opts.body !== undefined && opts.body !== null) {
        try {
          body = JSON.stringify(opts.body);
        } catch (e) {
          body = undefined;
        }
      }

      var signal = null;
      var controller = null;
      var timer = null;

      try {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
          signal = AbortSignal.timeout(6000);
        } else if (typeof AbortController !== 'undefined') {
          controller = new AbortController();
          timer = setTimeout(function () {
            try { controller.abort(); } catch (e) { /* ignore */ }
          }, 6000);
          signal = controller.signal;
        }
      } catch (e) {
        signal = null;
        controller = null;
      }

      return fetch(url, {
        method: opts.method || 'GET',
        headers: headers,
        body: body,
        signal: signal || undefined,
        credentials: 'omit',
        cache: 'no-store'
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res || !res.ok) return null;
        return res.json().catch(function () { return null; });
      }).catch(function () {
        if (timer) clearTimeout(timer);
        return null;
      });
    },

    session: function () {
      var payload = {
        uid: Save.data ? Save.data.uid : null,
        version: CONFIG.version,
        platform: 'web'
      };
      return this.request('/api/session', { method: 'POST', body: payload }).then(function (res) {
        if (res && res.token) API.token = res.token;
        return res;
      });
    },

    submitScore: function (score, runId, signature) {
      return this.request('/api/scores/submit', {
        method: 'POST',
        body: { score: score, runId: runId, signature: signature, version: CONFIG.version }
      });
    },

    claimReward: function (nonce) {
      return this.request('/api/rewards/claim', {
        method: 'POST',
        body: { nonce: nonce, uid: Save.data ? Save.data.uid : null }
      });
    },

    koraInitialize: function (sku, email, name) {
      return this.request('/api/purchases/kora/initialize', {
        method: 'POST',
        body: { sku: sku, email: email, name: name }
      });
    },

    koraStatus: function (reference) {
      return this.request('/api/purchases/kora/status?reference=' + encodeURIComponent(reference || ''));
    },

    remoteConfig: function () {
      return this.request('/api/config/remote');
    },

    version: function () {
      return this.request('/api/version');
    },

    getSsvNonce: function () {
      return this.request('/api/ads/ssv-nonce', { method: 'POST', body: {} });
    }
  };

  /* ==========================================================================
   * 9. Analytics — consent gated, batched
   * ======================================================================== */

  var Analytics = {
    queue: [],
    timer: null,

    allowed: function () {
      return !!(Save.data && Save.data.consent && Save.data.consent.analytics === true);
    },

    track: function (event, props) {
      if (!this.allowed()) return;
      this.queue.push({
        event: event,
        props: props || {},
        ts: now(),
        v: CONFIG.version
      });
      if (this.queue.length > 200) this.queue.splice(0, this.queue.length - 200);
    },

    flush: function () {
      if (!this.queue.length) return;
      if (!this.allowed()) {
        this.queue.length = 0;
        return;
      }
      var batch = this.queue.splice(0, 50);
      API.request('/api/analytics', {
        method: 'POST',
        body: { uid: Save.data ? Save.data.uid : null, events: batch }
      });
    },

    start: function () {
      var self = this;
      if (this.timer) return;
      this.timer = setInterval(function () { self.flush(); }, 15000);
    }
  };

  /* ==========================================================================
   * 10. UI
   * ======================================================================== */

  var UI = {
    screens: ['splash', 'consent', 'menu', 'game'],
    overlays: ['pause', 'gameover', 'settings'],
    toastTimer: null,

    showScreen: function (id) {
      this.screens.forEach(function (screenId) {
        var el = $(screenId);
        if (el) el.classList.toggle('active', screenId === id);
      });
    },

    showOverlay: function (id) {
      var el = $(id);
      if (el) el.classList.add('active');
    },

    hideOverlay: function (id) {
      var el = $(id);
      if (el) el.classList.remove('active');
    },

    hideAllOverlays: function () {
      var self = this;
      this.overlays.forEach(function (id) { self.hideOverlay(id); });
    },

    toast: function (msg, ms) {
      var el = $('toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(function () {
        el.classList.remove('show');
      }, ms == null ? 2200 : ms);
    },

    updateCurrency: function () {
      var coins = Save.data ? Save.data.coins : 0;
      var kobo = Save.data ? Save.data.kobo : 0;
      setHtml('hudCoins', '🪙 <b>' + fmt(coins) + '</b>');
      setHtml('hudKobo', '💎 <b>' + fmt(kobo) + '</b>');
    },

    applySettings: function () {
      var settings = (Save.data && Save.data.settings) || {};
      document.body.classList.toggle('colorblind', !!settings.colorblind);
      document.body.classList.toggle('reduced-motion', !!settings.reducedMotion);
      Audio.enabled = settings.sound !== false;
    }
  };

  /* ==========================================================================
   * 11. Weather
   * ======================================================================== */

  var WEATHER_TABLE = {
    clear: { grip: 1, visibility: 1, fareMultiplier: 1, patienceDrain: 1, icon: '☀️', label: 'Clear' },
    rain: { grip: 0.82, visibility: 0.85, fareMultiplier: 1.15, patienceDrain: 1.15, icon: '🌧️', label: 'Rain' },
    night: { grip: 0.95, visibility: 0.8, fareMultiplier: 1.25, patienceDrain: 1.1, icon: '🌙', label: 'Night' },
    harmattan: { grip: 0.92, visibility: 0.65, fareMultiplier: 1.1, patienceDrain: 1.05, icon: '🌫️', label: 'Harmattan' },
    rush: { grip: 1, visibility: 1, fareMultiplier: 1.3, patienceDrain: 1.25, icon: '🚦', label: 'Rush hour' }
  };

  var Weather = {
    current: 'clear',
    grip: 1,
    visibility: 1,
    fareMultiplier: 1,
    patienceDrain: 1,

    pick: function () {
      var hour = new Date().getHours();
      var isNight = hour >= 19 || hour < 6;
      var isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
      var roll = Math.random();

      if (isNight && roll < 0.65) {
        this.current = 'night';
      } else if (isRush && roll < 0.6) {
        this.current = 'rush';
      } else if (roll < 0.12) {
        this.current = 'rain';
      } else if (roll < 0.2) {
        this.current = 'harmattan';
      } else {
        this.current = 'clear';
      }

      if (isNight && this.current === 'harmattan') this.current = 'night';
      return this.current;
    },

    apply: function () {
      var table = WEATHER_TABLE[this.current] || WEATHER_TABLE.clear;
      this.grip = table.grip;
      this.visibility = table.visibility;
      this.fareMultiplier = table.fareMultiplier;
      this.patienceDrain = table.patienceDrain;

      var hud = $('hudWeather');
      if (hud) {
        hud.textContent = table.icon;
        hud.setAttribute('title', table.label);
        hud.setAttribute('aria-label', table.label);
      }
      return table;
    }
  };

  /* ==========================================================================
   * 12. Radio
   * ======================================================================== */

  var Radio = {
    current: 'afrobeats',
    _last: 0,

    STATIONS: {
      fuji: { label: 'Fuji', patience: 1.2, tip: 1, fineReduction: 0, fare: 1 },
      afrobeats: { label: 'Afrobeats', patience: 1, tip: 1.1, fineReduction: 0, fare: 1 },
      gospel: { label: 'Gospel', patience: 1, tip: 0.9, fineReduction: 0.2, fare: 1 },
      news: { label: 'News', patience: 0.8, tip: 1.15, fineReduction: 0, fare: 1.1 },
      sports: { label: 'Sports', patience: 0.9, tip: 1.05, fineReduction: 0, fare: 1 },
      danfofm: { label: 'Danfo FM', patience: 1.1, tip: 1, fineReduction: 0.1, fare: 1 }
    },

    effect: function () {
      var station = this.STATIONS[this.current] || this.STATIONS.afrobeats;
      return {
        patience: station.patience || 1,
        tip: station.tip || 1,
        fineReduction: station.fineReduction || 0,
        fare: station.fare || 1
      };
    },

    _paint: function () {
      var current = this.current;
      Array.prototype.forEach.call(document.querySelectorAll('.station'), function (el) {
        var isActive = el.getAttribute('data-station') === current;
        el.classList.toggle('active', isActive);
        el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    },

    switchTo: function (stationId) {
      if (!this.STATIONS[stationId]) return false;
      if (stationId === this.current) {
        this._paint();
        return true;
      }

      var elapsed = now() - this._last;
      if (elapsed < 5000) {
        UI.toast('Radio warming up — ' + Math.ceil((5000 - elapsed) / 1000) + 's');
        return false;
      }

      this._last = now();
      this.current = stationId;
      this._paint();
      Audio.beep(stationId === 'news' ? 300 : 520, 0.12, 'sine', 0.04);
      UI.toast('Now playing: ' + this.STATIONS[stationId].label);
      Analytics.track('radio_switch', { station: stationId });
      return true;
    }
  };

  /* ==========================================================================
   * 13. Game
   * ======================================================================== */

  var TRAFFIC_COLORS = ['#c0392b', '#2c7fb8', '#7b4fa0', '#2e8b57', '#b8860b', '#455a64'];

  var AGENT_LINES = {
    agbero: ['Oga, I dey load for you!', 'Enter with your change!', 'Lagos no dey carry last.'],
    lastma: ['Pull over!', 'Where your papers?', 'No parking here!'],
    police: ['Oga, wetin dey happen?', 'Settle this thing.', 'Checkpoint — open boot.']
  };

  var AGENT_COLORS = {
    agbero: '#8e44ad',
    lastma: '#f1c40f',
    police: '#1b3a6b'
  };

  var Game = {
    canvas: null,
    ctx: null,
    W: 0,
    H: 0,
    dpr: 1,

    roadLeft: 0,
    roadWidth: 0,
    laneWidth: 0,
    busW: 0,
    busH: 0,

    running: false,
    paused: false,
    mode: 'endless',

    lane: 1,
    targetLaneX: 0,
    playerX: 0,
    playerY: 0,

    speed: 0,
    distance: 0,
    scrollY: 0,
    fuel: 100,
    smoothness: 1,
    fares: 0,
    passengers: 0,
    crashCount: 0,
    elapsed: 0,

    traffic: [],
    pickups: [],
    hazards: [],
    agents: [],
    particles: [],
    passengersOnBus: [],

    lastT: 0,
    rafId: null,
    loopBound: null,
    lastBrake: 0,
    spawnTrafficTimer: 0,
    spawnPickupTimer: 0,
    boardCooldown: 0,

    conductorMode: false,
    boostUntil: 0,
    comebackUntil: 0,
    doubled: false,
    rewardPending: false,
    runId: '',

    hudAt: 0,
    hudSignature: '',

    /* ── lifecycle ───────────────────────────────────────────────────────── */

    init: function () {
      this.canvas = $('gameCanvas');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.loopBound = this.loop.bind(this);

      this.lane = 1;
      this.resize();

      var self = this;
      window.addEventListener('resize', function () { self.resize(); });
      window.addEventListener('orientationchange', function () {
        setTimeout(function () { self.resize(); }, 250);
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function () { self.resize(); });
      }

      this.bindControls();
    },

    resize: function () {
      if (!this.canvas) return;

      var vw = Math.round(window.innerWidth || 360);
      var vh = Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight || 640);

      this.W = Math.max(280, vw);
      this.H = Math.max(360, vh);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.round(this.W * this.dpr);
      this.canvas.height = Math.round(this.H * this.dpr);
      this.canvas.style.width = this.W + 'px';
      this.canvas.style.height = this.H + 'px';

      if (this.ctx && this.ctx.setTransform) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }

      var world = CONFIG.world;
      this.roadWidth = Math.round(this.W * world.roadWidthRatio);
      this.roadLeft = Math.round((this.W - this.roadWidth) / 2);
      this.laneWidth = this.roadWidth / world.laneCount;
      this.busW = Math.round(this.laneWidth * 0.62);
      this.busH = Math.round(this.busW * 1.9);
      this.playerY = Math.round(this.H - this.busH - Math.min(150, this.H * 0.2));

      this.targetLaneX = this.laneCenterX(this.lane);
      this.playerX = this.targetLaneX;

      if (this.paused) this.draw();
    },

    laneCenterX: function (index) {
      return this.roadLeft + this.laneWidth * (index + 0.5);
    },

    /* ── controls ────────────────────────────────────────────────────────── */

    bindControls: function () {
      var self = this;

      /* Keyboard */
      document.addEventListener('keydown', function (e) {
        if (!self.running) return;
        var key = e.key;

        if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
          e.preventDefault();
          self.steer(-1);
        } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
          e.preventDefault();
          self.steer(1);
        } else if (key === 'ArrowDown' || key === 's' || key === 'S' || key === ' ') {
          e.preventDefault();
          self.brake();
        } else if (key === 'r' || key === 'R') {
          self.start(self.mode);
        } else if (key === 'Escape' || key === 'p' || key === 'P') {
          if (self.paused) self.resume();
          else self.pause();
        }
      });

      /* On-screen steering buttons */
      var buttons = [
        { el: $('ctrlLeft'), action: function () { self.steer(-1); } },
        { el: $('ctrlRight'), action: function () { self.steer(1); } },
        { el: $('ctrlBrake'), action: function () { self.brake(); } }
      ];

      Array.prototype.forEach.call(document.querySelectorAll('[data-ctrl]'), function (el) {
        var ctrl = el.getAttribute('data-ctrl');
        if (ctrl === 'left') buttons.push({ el: el, action: function () { self.steer(-1); } });
        if (ctrl === 'right') buttons.push({ el: el, action: function () { self.steer(1); } });
        if (ctrl === 'brake') buttons.push({ el: el, action: function () { self.brake(); } });
      });

      buttons.forEach(function (item) {
        if (!item.el) return;
        var held = false;

        function press(e) {
          if (e && e.cancelable) e.preventDefault();
          if (held) return;
          held = true;
          item.el.setAttribute('data-pressed', 'true');
          item.action();
        }
        function release() {
          held = false;
          item.el.removeAttribute('data-pressed');
        }

        item.el.addEventListener('touchstart', press, { passive: false });
        item.el.addEventListener('touchend', release);
        item.el.addEventListener('touchcancel', release);
        item.el.addEventListener('mousedown', press);
        item.el.addEventListener('mouseup', release);
        item.el.addEventListener('mouseleave', release);
      });

      /* Canvas swipe + tap */
      if (this.canvas) {
        var startX = 0;
        var startY = 0;
        var startT = 0;
        var lastTouch = 0;

        this.canvas.addEventListener('touchstart', function (e) {
          var touch = e.changedTouches && e.changedTouches[0];
          if (!touch) return;
          startX = touch.clientX;
          startY = touch.clientY;
          startT = now();
          if (e.cancelable) e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', function (e) {
          var touch = e.changedTouches && e.changedTouches[0];
          if (!touch) return;
          var dx = touch.clientX - startX;
          var dy = touch.clientY - startY;

          if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
            self.steer(dx > 0 ? 1 : -1);
          } else if (dy > 45 && Math.abs(dy) > Math.abs(dx)) {
            self.brake();
          } else           if (now() - startT < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
            self.toggleConductor();
          }

          lastTouch = now();
          if (e.cancelable) e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('click', function () {
          if (!self.running) return;
          // Browsers fire a synthetic click after a tap; the touchend already handled it.
          if (now() - lastTouch < 600) return;
          self.toggleConductor();
        });
      }

      /* HUD + overlay buttons */
      var bind = function (id, fn) {
        var el = $(id);
        if (el) el.addEventListener('click', fn);
      };

      bind('btnConductor', function () { self.toggleConductor(); });
      bind('btnPause', function () { self.pause(); });
      bind('btnResume', function () { self.resume(); });
      bind('btnRestart', function () { self.start(self.mode); });
      bind('btnQuit', function () { self.quitToMenu(); });
      bind('btnDoubleReward', function () { self.watchRewardAd('double'); });
      bind('btnRetry', function () { self.start(self.mode); });
      bind('btnMenu', function () { self.quitToMenu(); });

      /* Radio stations */
      Array.prototype.forEach.call(document.querySelectorAll('.station'), function (station) {
        station.addEventListener('click', function () {
          Radio.switchTo(station.getAttribute('data-station'));
        });
      });

      Radio._paint();
    },

    steer: function (dir) {
      if (!this.running || this.paused) return;
      var next = clamp(this.lane + (dir < 0 ? -1 : 1), 0, CONFIG.world.laneCount - 1);
      if (next === this.lane) return;

      this.lane = next;
      this.targetLaneX = this.laneCenterX(next);
      Haptics.pulse(8);
      Audio.beep(420, 0.05, 'triangle', 0.03);
    },

    brake: function () {
      if (!this.running || this.paused) return;
      this.speed = Math.max(CONFIG.world.baseSpeed * 0.4, this.speed * 0.7);
      this.lastBrake = now();
      this.smoothness = clamp(this.smoothness - 0.05, 0, 1);
      Haptics.pulse(18);
      Audio.beep(160, 0.12, 'sawtooth', 0.05);
    },

    toggleConductor: function () {
      this.conductorMode = !this.conductorMode;
      var btn = $('btnConductor');
      if (btn) {
        btn.classList.toggle('active', this.conductorMode);
        btn.setAttribute('aria-pressed', this.conductorMode ? 'true' : 'false');
      }
      UI.toast(this.conductorMode ? 'Conductor view on' : 'Conductor view off', 1400);
      Haptics.pulse(10);
    },

    /* ── run lifecycle ───────────────────────────────────────────────────── */

    start: function (mode) {
      if (!this.ctx) this.init();
      if (!this.ctx) return;

      this.mode = mode || 'endless';
      this.runId = uid();

      this.running = true;
      this.paused = false;
      this.doubled = false;

      this.lane = 1;
      this.targetLaneX = this.laneCenterX(1);
      this.speed = CONFIG.world.baseSpeed;
      this.distance = 0;
      this.scrollY = 0;
      this.elapsed = 0;
      this.fuel = 100;
      this.smoothness = 1;
      this.fares = 0;
      this.passengers = 0;
      this.crashCount = 0;
      this.lastBrake = 0;
      this.boardCooldown = 0;
      this.boostUntil = 0;
      this.comebackUntil = (Save.data && Save.data.comebackUntil) || 0;
      this.rewardPending = false;
      this.spawnTrafficTimer = 1;
      this.spawnPickupTimer = 2.2;

      this.traffic.length = 0;
      this.pickups.length = 0;
      this.hazards.length = 0;
      this.agents.length = 0;
      this.particles.length = 0;
      this.passengersOnBus.length = 0;

      Weather.pick();
      Weather.apply();

      UI.hideAllOverlays();
      UI.showScreen('game');
      this.resize();
      this.hudSignature = '';
      this.updateHud(true);

      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.lastT = 0;
      this.rafId = requestAnimationFrame(this.loopBound);

      Analytics.track('run_start', { mode: this.mode, weather: Weather.current });
    },

    quitToMenu: function () {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.running = false;
      this.paused = false;

      UI.hideAllOverlays();
      UI.showScreen('menu');
      UI.updateCurrency();
      this.refreshDaily();
    },

    pause: function () {
      if (!this.running || this.paused) return;
      this.paused = true;
      UI.showOverlay('pause');
      Analytics.track('run_pause', {});
    },

    resume: function () {
      if (!this.running) return;
      this.paused = false;
      UI.hideOverlay('pause');
      this.lastT = 0;
    },

    loop: function (t) {
      if (!this.running) {
        this.rafId = null;
        return;
      }

      if (!this.lastT) this.lastT = t;
      var dt = (t - this.lastT) / 1000;
      this.lastT = t;
      dt = clamp(dt, 0, 0.05);

      if (!this.paused) this.update(dt);
      this.draw();

      this.rafId = requestAnimationFrame(this.loopBound);
    },

    /* ── update ──────────────────────────────────────────────────────────── */

    update: function (dt) {
      this.elapsed += dt;

      var world = CONFIG.world;
      var speedScale = clamp((Save.data && Save.data.settings.speed) || 1, 0.8, 1.2);

      var target = Math.min(world.baseSpeed + this.distance * 0.06, world.maxSpeed) * speedScale;
      var step = world.speedRampPerSec * 8 * dt;
      if (this.speed < target) {
        this.speed = Math.min(target, this.speed + step);
      } else {
        this.speed = Math.max(target, this.speed - step * 2);
      }

      var dy = this.speed * dt;
      this.scrollY += dy;
      this.distance += dy;

      this.fuel = Math.max(0, this.fuel - 1.4 * dt);
      if (this.fuel <= 0) {
        this.endRun('empty');
        return;
      }

      this.playerX += (this.targetLaneX - this.playerX) * clamp(dt * 14, 0, 1);

      if (now() - this.lastBrake > 1500) {
        this.smoothness = clamp(this.smoothness + 0.15 * dt, 0, 1);
      }

      this.spawnStuff(dt);
      this.updateTraffic(dt, dy);
      if (!this.running) return;
      this.updatePickups(dt, dy);
      if (!this.running) return;
      this.updateHazards(dt, dy);
      if (!this.running) return;
      this.updateAgents(dt, dy);
      if (!this.running) return;
      this.updateParticles(dt);
      this.updatePassengers(dt);
      this.updateHud();
    },

    spawnStuff: function (dt) {
      this.spawnTrafficTimer -= dt;
      var interval = clamp(1.4 - this.distance / 40000, 0.5, 1.4);

      if (this.spawnTrafficTimer <= 0) {
        this.spawnTraffic();
        if (Math.random() < 0.35) this.spawnHazard();
        if (Math.random() < 0.12) this.spawnAgent();
        this.spawnTrafficTimer = interval * (0.75 + Math.random() * 0.6);
      }

      this.spawnPickupTimer -= dt;
      if (this.spawnPickupTimer <= 0) {
        this.spawnPickup();
        this.spawnPickupTimer = 3.2;
      }
    },

    spawnTraffic: function () {
      var lanes = CONFIG.world.laneCount;
      var lane = randInt(0, lanes - 1);
      var tries = 0;

      while (lane === this.lane && tries < 8) {
        lane = randInt(0, lanes - 1);
        tries++;
      }

      var scale = rand(0.85, 1.1);
      var w = Math.round(this.busW * scale);
      var h = Math.round(w * 1.85);
      var x = this.laneCenterX(lane) - w / 2;
      var y = -h - 40;

      for (var i = 0; i < this.traffic.length; i++) {
        var other = this.traffic[i];
        if (Math.abs(other.x - x) < w * 0.9 && other.y < h + 60) return;
      }

      this.traffic.push({
        x: x,
        y: y,
        w: w,
        h: h,
        speed: rand(80, 180),
        color: pick(TRAFFIC_COLORS),
        dead: false
      });
    },

    spawnHazard: function () {
      var lanes = CONFIG.world.laneCount;
      var lane = randInt(0, lanes - 1);
      var radius = rand(14, 26);
      this.hazards.push({
        x: this.laneCenterX(lane) + rand(-this.laneWidth * 0.22, this.laneWidth * 0.22),
        y: -80,
        r: radius,
        type: Math.random() < 0.6 ? 'pothole' : 'cone',
        dead: false
      });
    },

    spawnAgent: function () {
      var lanes = CONFIG.world.laneCount;
      var lane = randInt(0, lanes - 1);
      var type = pick(['agbero', 'lastma', 'police']);

      this.agents.push({
        type: type,
        x: this.laneCenterX(lane) - 18,
        y: -100,
        w: 36,
        h: 60,
        text: pick(AGENT_LINES[type] || ['Move!']),
        handled: false,
        dead: false
      });
    },

    spawnPickup: function () {
      var lanes = CONFIG.world.laneCount;
      var lane = randInt(0, lanes - 1);
      var width = this.laneWidth * 0.8;

      this.pickups.push({
        x: this.laneCenterX(lane),
        y: -120,
        w: width,
        h: 90,
        pax: randInt(1, 3),
        patience: 1,
        fare: CONFIG.economy.farePerPassenger,
        dead: false
      });
    },

    playerBox: function () {
      return {
        x: this.playerX - this.busW / 2,
        y: this.playerY,
        w: this.busW,
        h: this.busH
      };
    },

    updateTraffic: function (dt, dy) {
      var player = this.playerBox();

      for (var i = this.traffic.length - 1; i >= 0; i--) {
        var car = this.traffic[i];
        car.y += dy - car.speed * dt;

        if (!car.dead && boxesOverlap(player, car)) {
          car.dead = true;
          this.crash(car, false);
          if (!this.running) return;
        }

        if (car.y > this.H + 200) this.traffic.splice(i, 1);
      }
    },

    updatePickups: function (dt, dy) {
      this.boardCooldown = Math.max(0, this.boardCooldown - dt);

      var player = this.playerBox();
      var pad = now() < this.boostUntil ? 26 : 0;
      var boardingBox = {
        x: player.x - pad,
        y: player.y - pad,
        w: player.w + pad * 2,
        h: player.h + pad * 2
      };

      for (var i = this.pickups.length - 1; i >= 0; i--) {
        var stop = this.pickups[i];
        stop.y += dy;

        if (stop.y > this.H + 200) {
          this.pickups.splice(i, 1);
          continue;
        }

        var zone = { x: stop.x - stop.w / 2, y: stop.y - stop.h / 2, w: stop.w, h: stop.h };

        if (stop.pax > 0 && boxesOverlap(boardingBox, zone) &&
            this.speed < CONFIG.world.baseSpeed * 1.25 && this.boardCooldown <= 0) {
          this.boardPassenger(stop);
          stop.pax -= 1;
          this.boardCooldown = 0.5;

          if (stop.pax <= 0) this.pickups.splice(i, 1);
        }
      }
    },

    updateHazards: function (dt, dy) {
      var player = this.playerBox();

      for (var i = this.hazards.length - 1; i >= 0; i--) {
        var hazard = this.hazards[i];
        hazard.y += dy;

        if (hazard.y > this.H + 120) {
          this.hazards.splice(i, 1);
          continue;
        }

        if (!hazard.dead && circleRect(hazard.x, hazard.y, hazard.r, player)) {
          hazard.dead = true;

          if (hazard.type === 'pothole') {
            this.crash(hazard, true);
          } else {
            this.smoothness = clamp(this.smoothness - 0.1, 0, 1);
            this.speed = Math.max(CONFIG.world.baseSpeed * 0.4, this.speed * 0.9);
            this.spawnParticles(hazard.x, hazard.y, '#e74c3c', 6);
            Haptics.pulse(20);
            Audio.beep(180, 0.1, 'square', 0.05);
          }

          if (!this.running) return;
        }
      }
    },

    updateAgents: function (dt, dy) {
      var player = this.playerBox();

      for (var i = this.agents.length - 1; i >= 0; i--) {
        var agent = this.agents[i];
        agent.y += dy;

        if (agent.y > this.H + 120) {
          this.agents.splice(i, 1);
          continue;
        }

        if (!agent.handled && boxesOverlap(player, agent)) {
          agent.handled = true;
          this.interactAgent(agent);
          if (!this.running) return;
        }
      }
    },

    interactAgent: function (agent) {
      var effect = Radio.effect();

      if (agent.type === 'lastma') {
        var fine = Math.round(100 * (1 - (effect.fineReduction || 0)));
        if (Math.random() < 0.5) {
          this.fares = Math.max(0, this.fares - fine);
          this.smoothness = clamp(this.smoothness - 0.05, 0, 1);
          UI.toast('LASTMA fine: ₦' + fmt(fine));
          Analytics.track('agent_lastma_fine', { fine: fine });
        } else {
          Save.data.reputation = clamp(Save.data.reputation - 6, 0, CONFIG.economy.reputationMax);
          UI.toast('LASTMA warning — reputation −6');
          Analytics.track('agent_lastma_warning', {});
        }
        Haptics.pulse(24);
        Audio.beep(200, 0.14, 'square', 0.05);
        return;
      }

      if (agent.type === 'police') {
        var bribe = 150;
        if (this.fares >= bribe) {
          this.fares -= bribe;
          UI.toast('Checkpoint settled: ₦' + fmt(bribe));
          Haptics.pulse(16);
          Audio.coin();
          Analytics.track('agent_police_bribe', { bribe: bribe });
        } else {
          UI.toast('Arrested at the checkpoint.');
          this.endRun('arrested');
        }
        return;
      }

      this.boostUntil = now() + 8000;
      UI.toast('Agbero hired — boarding reach up for 8s');
      Haptics.pulse(12);
      Audio.beep(600, 0.1, 'triangle', 0.04);
      Analytics.track('agent_agbero_hire', {});
    },

    updateParticles: function (dt) {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 600 * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
    },

    updatePassengers: function (dt) {
      var effect = Radio.effect();
      var drain = 0.02 * Weather.patienceDrain / Math.max(0.2, effect.patience || 1);

      for (var i = this.passengersOnBus.length - 1; i >= 0; i--) {
        var rider = this.passengersOnBus[i];
        rider.patience -= dt * drain;

        if (rider.patience <= 0) {
          this.passengersOnBus.splice(i, 1);
          this.passengers = this.passengersOnBus.length;
          Save.data.reputation = clamp(Save.data.reputation - 4, 0, CONFIG.economy.reputationMax);
          UI.toast('Passenger walked off — reputation −4');
          Haptics.pulse(30);
          Analytics.track('passenger_abandoned', {});
        }
      }
    },

    boardPassenger: function (stop) {
      var effect = Radio.effect();
      var fare = Math.round(CONFIG.economy.farePerPassenger * Weather.fareMultiplier * (effect.tip || 1));

      if (this.comebackUntil && this.comebackUntil > now()) {
        fare = Math.round(fare * CONFIG.economy.comebackMultiplier);
      }

      this.fares += fare;
      this.passengersOnBus.push({ fare: fare, patience: 1, boardedAt: now() });
      this.passengers = this.passengersOnBus.length;
      Save.data.reputation = clamp(Save.data.reputation + 1, 0, CONFIG.economy.reputationMax);

      Audio.pickup();
      Haptics.pulse(12);
      this.spawnParticles(stop.x, stop.y, '#FFC72C', 10);
      UI.toast('+₦' + fmt(fare) + ' fare boarded', 1400);
      Analytics.track('passenger_board', { fare: fare, pax: this.passengers });
    },

    dropoffAll: function () {
      var total = Math.round(this.fares);
      Save.data.coins += total;
      Save.save();

      this.fares = 0;
      this.passengersOnBus.length = 0;
      this.passengers = 0;

      UI.updateCurrency();
      Audio.dropoff();
      this.spawnParticles(this.playerX, this.playerY, '#00A651', 18);
      UI.toast('Dropped off — ₦' + fmt(total) + ' banked');
      Analytics.track('passengers_dropoff', { coins: total });
      return total;
    },

    crash: function (obj, soft) {
      this.crashCount += 1;
      Save.data.reputation = clamp(
        Save.data.reputation - (soft ? 3 : 8),
        0,
        CONFIG.economy.reputationMax
      );
      this.smoothness = clamp(this.smoothness - 0.2, 0, 1);
      this.speed = Math.max(CONFIG.world.baseSpeed * 0.45, this.speed * 0.6);

      Haptics.pulse(soft ? 30 : 80);
      Audio.crash();

      var x = obj && obj.x != null ? obj.x + (obj.w ? obj.w / 2 : 0) : this.playerX;
      var y = obj && obj.y != null ? obj.y + (obj.h ? obj.h / 2 : 0) : this.playerY;
      this.spawnParticles(x, y, '#ff5a3c', soft ? 8 : 16);

      if (this.crashCount >= 3 && !soft) {
        this.endRun('crashed');
      }
    },

    spawnParticles: function (x, y, color, count) {
      var n = count || 8;
      if (Save.data && Save.data.settings.reducedMotion) n = Math.ceil(n / 2);

      for (var i = 0; i < n; i++) {
        this.particles.push({
          x: x,
          y: y,
          vx: rand(-140, 140),
          vy: rand(-180, 60),
          life: rand(0.35, 0.8),
          max: 0.8,
          color: color || '#FFC72C',
          size: rand(2, 5)
        });
      }
    },

    updateHud: function (force) {
      var t = now();
      // Rewriting four HUD nodes every animation frame is wasted work on
      // mid-range Android; the values cannot change faster than this anyway.
      if (!force && t - this.hudAt < 150) return;
      this.hudAt = t;

      var coins = Math.round((Save.data.coins || 0) + this.fares);
      var fuel = Math.round(this.fuel);
      var pax = this.passengersOnBus.length;

      var date = new Date();
      var hour = date.getHours();
      var icon = (hour >= 19 || hour < 6) ? '🌙' : (hour >= 12 && hour < 18 ? '🌤️' : '🌅');
      var clock = icon + ' ' + pad2(hour) + ':' + pad2(date.getMinutes());

      var signature = coins + '|' + fuel + '|' + pax + '|' + clock;
      if (!force && signature === this.hudSignature) return;
      this.hudSignature = signature;

      setHtml('inGameCoins', '🪙 <b>' + fmt(coins) + '</b>');
      setHtml('inGameFuel', '⛽ <b>' + fuel + '%</b>');
      setHtml('inGamePax', '👥 <b>' + pax + '</b>');
      setHtml('hudTime', clock);
    },

    /* ── draw ────────────────────────────────────────────────────────────── */

    draw: function () {
      var ctx = this.ctx;
      if (!ctx) return;

      var W = this.W;
      var H = this.H;
      var night = Weather.current === 'night';

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      /* sky / ground */
      ctx.fillStyle = night ? '#0a0a12' : '#1a1a1a';
      ctx.fillRect(0, 0, W, H);

      /* road */
      ctx.fillStyle = night ? '#111111' : '#2a2a2a';
      ctx.fillRect(this.roadLeft, 0, this.roadWidth, H);

      /* dashed lane markers */
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3;
      if (ctx.setLineDash) ctx.setLineDash([28, 28]);
      ctx.lineDashOffset = -(this.scrollY % 56);
      for (var lane = 1; lane < CONFIG.world.laneCount; lane++) {
        var lx = this.roadLeft + this.laneWidth * lane;
        ctx.beginPath();
        ctx.moveTo(lx, -60);
        ctx.lineTo(lx, H + 60);
        ctx.stroke();
      }
      ctx.restore();

      /* yellow road edges */
      ctx.fillStyle = '#FFC72C';
      ctx.fillRect(this.roadLeft - 6, 0, 6, H);
      ctx.fillRect(this.roadLeft + this.roadWidth, 0, 6, H);

      /* pickups */
      for (var p = 0; p < this.pickups.length; p++) {
        var stop = this.pickups[p];
        var sx = stop.x - stop.w / 2;
        var sy = stop.y - stop.h / 2;

        ctx.fillStyle = 'rgba(255,199,44,0.35)';
        roundRect(ctx, sx, sy, stop.w, stop.h, 8);
        ctx.fill();

        ctx.strokeStyle = '#FFC72C';
        ctx.lineWidth = 2;
        roundRect(ctx, sx, sy, stop.w, stop.h, 8);
        ctx.stroke();

        ctx.fillStyle = '#FFE9A8';
        ctx.font = 'bold 15px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👥 ' + stop.pax, stop.x, stop.y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }

      /* hazards */
      for (var h = 0; h < this.hazards.length; h++) {
        var hazard = this.hazards[h];

        if (hazard.type === 'pothole') {
          ctx.fillStyle = '#050505';
          ctx.beginPath();
          ctx.ellipse
            ? ctx.ellipse(hazard.x, hazard.y, hazard.r, hazard.r * 0.62, 0, 0, Math.PI * 2)
            : ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.moveTo(hazard.x, hazard.y - hazard.r);
          ctx.lineTo(hazard.x + hazard.r * 0.9, hazard.y + hazard.r);
          ctx.lineTo(hazard.x - hazard.r * 0.9, hazard.y + hazard.r);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      /* traffic */
      for (var t = 0; t < this.traffic.length; t++) {
        var car = this.traffic[t];
        this.drawVehicle(car.x, car.y, car.w, car.h, car.color);
      }

      /* agents */
      for (var a = 0; a < this.agents.length; a++) {
        var agent = this.agents[a];
        var acolor = AGENT_COLORS[agent.type] || '#888';

        ctx.fillStyle = acolor;
        roundRect(ctx, agent.x, agent.y, agent.w, agent.h, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(agent.type.toUpperCase(), agent.x + agent.w / 2, agent.y - 6);
        ctx.textAlign = 'left';
      }

      /* player */
      this.drawBus(this.playerX - this.busW / 2, this.playerY, this.busW, this.busH);

      /* particles */
      for (var i = 0; i < this.particles.length; i++) {
        var particle = this.particles[i];
        ctx.globalAlpha = clamp(particle.life / particle.max, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;

      /* weather overlays */
      if (Weather.current === 'rain') {
        ctx.strokeStyle = 'rgba(180,200,255,0.35)';
        ctx.lineWidth = 2;
        for (var r = 0; r < 60; r++) {
          var rx = (r * 97) % W;
          var ry = (r * 131 + this.scrollY * 3) % H;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 4, ry + 18);
          ctx.stroke();
        }
      }
      if (Weather.current === 'night') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);

        try {
          var gradient = ctx.createRadialGradient(
            this.playerX, this.playerY + this.busH * 0.4, 10,
            this.playerX, this.playerY + this.busH * 0.4, 230
          );
          gradient.addColorStop(0, 'rgba(255,240,180,0.22)');
          gradient.addColorStop(1, 'rgba(255,240,180,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, W, H);
        } catch (e) { /* gradient unsupported */ }
      }
      if (Weather.current === 'harmattan') {
        ctx.fillStyle = 'rgba(210,180,140,0.25)';
        ctx.fillRect(0, 0, W, H);
      }

      /* conductor mini-map */
      if (this.conductorMode) {
        var pw = 120;
        var ph = 90;
        var px = W - pw - 12;
        var py = 64;

        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        roundRect(ctx, px, py, pw, ph, 10);
        ctx.fill();
        ctx.strokeStyle = '#FFC72C';
        ctx.lineWidth = 2;
        roundRect(ctx, px, py, pw, ph, 10);
        ctx.stroke();

        ctx.fillStyle = '#FFC72C';
        ctx.font = 'bold 10px Inter, Arial, sans-serif';
        ctx.fillText('CONDUCTOR', px + 10, py + 16);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Inter, Arial, sans-serif';
        ctx.fillText('Pax  ' + this.passengersOnBus.length, px + 10, py + 36);
        ctx.fillText('Rep  ' + Math.round(Save.data.reputation), px + 10, py + 54);
        ctx.fillText('Smooth  ' + Math.round(this.smoothness * 100) + '%', px + 10, py + 72);
      }
    },

    drawVehicle: function (x, y, w, h, color) {
      var ctx = this.ctx;

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 2, y + 6, w, h - 8);

      ctx.fillStyle = color || '#888';
      roundRect(ctx, x, y + 4, w, h - 10, Math.max(4, w * 0.12));
      ctx.fill();

      ctx.fillStyle = '#111';
      roundRect(ctx, x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.14, 3);
      ctx.fill();
      roundRect(ctx, x + w * 0.12, y + h * 0.72, w * 0.76, h * 0.12, 3);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + w * 0.18, y + h * 0.34, w * 0.64, h * 0.34);

      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(x - 2, y + h * 0.22, 4, h * 0.16);
      ctx.fillRect(x + w - 2, y + h * 0.22, 4, h * 0.16);
      ctx.fillRect(x - 2, y + h * 0.62, 4, h * 0.16);
      ctx.fillRect(x + w - 2, y + h * 0.62, 4, h * 0.16);
    },

    drawBus: function (x, y, w, h) {
      var ctx = this.ctx;

      /* shadow */
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse
        ? ctx.ellipse(x + w / 2, y + h - 2, w * 0.54, 8, 0, 0, Math.PI * 2)
        : ctx.arc(x + w / 2, y + h - 2, w * 0.5, 0, Math.PI * 2);
      ctx.fill();

      /* body */
      ctx.fillStyle = '#FFC72C';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y + 2, w, h - 8, Math.max(4, w * 0.1));
      ctx.fill();
      ctx.stroke();

      /* trim */
      ctx.fillStyle = '#111111';
      ctx.fillRect(x + 2, y + h * 0.58, w - 4, Math.max(2, h * 0.02));

      /* windows: windshield, side strip, rear */
      ctx.fillStyle = '#111111';
      roundRect(ctx, x + w * 0.11, y + h * 0.09, w * 0.78, h * 0.14, 3);
      ctx.fill();
      roundRect(ctx, x + w * 0.08, y + h * 0.3, w * 0.14, h * 0.22, 2);
      ctx.fill();
      roundRect(ctx, x + w * 0.78, y + h * 0.3, w * 0.14, h * 0.22, 2);
      ctx.fill();
      roundRect(ctx, x + w * 0.11, y + h * 0.78, w * 0.78, h * 0.12, 3);
      ctx.fill();

      /* route text */
      ctx.save();
      ctx.fillStyle = '#111111';
      ctx.font = 'bold ' + Math.max(6, Math.round(w * 0.15)) + 'px Bungee, Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DUTCHKEM', x + w / 2, y + h * 0.42);
      ctx.restore();

      /* wheels */
      ctx.fillStyle = '#0b0b0b';
      ctx.fillRect(x - 3, y + h * 0.2, 5, h * 0.16);
      ctx.fillRect(x + w - 2, y + h * 0.2, 5, h * 0.16);
      ctx.fillRect(x - 3, y + h * 0.62, 5, h * 0.16);
      ctx.fillRect(x + w - 2, y + h * 0.62, 5, h * 0.16);

      /* reputation aura */
      if (Save.data && Save.data.reputation > 70) {
        ctx.strokeStyle = 'rgba(0,166,81,0.9)';
        ctx.lineWidth = 2;
        roundRect(ctx, x - 4, y - 2, w + 8, h + 2, Math.max(6, w * 0.14));
        ctx.stroke();
      }
    },

    /* ── end of run ──────────────────────────────────────────────────────── */

    endRun: function (reason) {
      if (!this.running) return;

      this.running = false;
      this.paused = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;

      var earned = Math.round(this.fares);
      Save.data.coins += earned;
      Save.data.totalRuns = (Save.data.totalRuns || 0) + 1;

      var rawScore = Math.round(this.distance) + earned * 10 + this.passengers * 50;
      var score = Math.min(rawScore, CONFIG.anticheat.maxScorePerRun);
      if (score > (Save.data.highScore || 0)) Save.data.highScore = score;

      Save.data.reputation = clamp(Save.data.reputation, 0, CONFIG.economy.reputationMax);
      Save.save();

      setText('resFares', '₦' + fmt(earned));
      setText('resPax', String(this.passengers));
      setText('resDist', (this.distance / 1000).toFixed(2) + ' km');
      setText('resRep', String(Math.round(Save.data.reputation)));

      var left = Ads.rewardedLeft();
      var note = left > 0
        ? 'Watch an optional ad to double ₦' + fmt(earned) + '. ' + left + ' rewarded view' + (left === 1 ? '' : 's') + ' left today.'
        : 'No rewarded ads left today. © 2026 Dutchkem Ventures.';
      setText('goAdNote', note);

      UI.hideOverlay('pause');
      UI.showOverlay('gameover');
      UI.updateCurrency();
      Haptics.pulse(60);

      Analytics.track('run_end', {
        reason: reason || 'crashed',
        score: score,
        distance: Math.round(this.distance),
        fares: earned,
        pax: this.passengers
      });

      this.submitScore(score);

      if (reason !== 'arrested') {
        Ads.showInterstitial();
      }
    },

    submitScore: function (score) {
      if (!score || score > CONFIG.anticheat.maxScorePerRun) return;

      // TODO(phase 5+): sign runs with the session token returned by API.session()
      // so the server can verify reaction times and score deltas.
      var signature = null;
      if (!signature) {
        console.info('[LagosRun] score held locally — signed submission lands with the backend phase.', score);
        return;
      }

      API.submitScore(score, this.runId, signature);
    },

    watchRewardAd: function (kind) {
      var self = this;

      if (kind !== 'double') return Promise.resolve(false);
      if (this.doubled) {
        UI.toast('You already doubled this run.');
        return Promise.resolve(false);
      }
      // A double tap used to start two ad flows and pay the bonus twice.
      if (this.rewardPending) return Promise.resolve(false);

      this.rewardPending = true;
      var button = $('btnDoubleReward');
      if (button) button.disabled = true;
      var base = Math.round(this.fares);

      var settle = function (result) {
        self.rewardPending = false;
        if (button) button.disabled = false;
        return result;
      };

      return Ads.showRewarded('double').then(function (watched) {
        if (!watched) return settle(false);

        var extra = base;
        Save.data.coins += extra;
        self.doubled = true;
        Save.save();

        UI.updateCurrency();
        UI.toast('2× fares! +₦' + fmt(extra));
        Audio.coin();

        UI.hideOverlay('gameover');
        UI.showScreen('menu');
        self.refreshDaily();

        Analytics.track('double_reward', { extra: extra });
        return settle(true);
      }, function () {
        return settle(false);
      });
    },

    /* ── daily ───────────────────────────────────────────────────────────── */

    refreshDaily: function () {
      if (!Save.data) return;
      var daily = Save.data.daily || (Save.data.daily = { date: todayKey(), streak: 0, claimed: false });

      if (daily.date !== todayKey()) {
        daily.date = todayKey();
        daily.claimed = false;
        if ((daily.streak || 0) >= 7) daily.streak = 0;
        Save.save();
      }
    },

    claimDaily: function () {
      this.refreshDaily();
      var daily = Save.data.daily;

      if (daily.claimed) {
        UI.toast('Daily reward already claimed today.');
        return false;
      }

      var index = Math.min(daily.streak || 0, CONFIG.economy.dailyRewardCoins.length - 1);
      var reward = CONFIG.economy.dailyRewardCoins[index];

      Save.data.coins += reward;
      daily.claimed = true;
      daily.streak = Math.min((daily.streak || 0) + 1, 7);
      Save.save();

      UI.updateCurrency();
      UI.toast('Daily reward: 🪙 ' + fmt(reward) + ' — day ' + daily.streak + ' of 7');
      Audio.reward();
      Haptics.pulse(20);
      Analytics.track('daily_claim', { coins: reward, streak: daily.streak });
      return true;
    }
  };

  /* ==========================================================================
   * 14. Bootstrap
   * ======================================================================== */

  function bind(id, event, handler) {
    var el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function syncSettingsInputs() {
    var settings = Save.data.settings || {};
    var map = {
      setColorblind: !!settings.colorblind,
      setReducedMotion: !!settings.reducedMotion,
      setSound: settings.sound !== false,
      setHaptics: settings.haptics !== false
    };
    Object.keys(map).forEach(function (id) {
      var el = $(id);
      if (el) el.checked = map[id];
    });
    var speed = $('setSpeed');
    if (speed) speed.value = String(settings.speed || 1);
  }

  function readSettingsInputs() {
    var settings = Save.data.settings;
    var colorblind = $('setColorblind');
    var reduced = $('setReducedMotion');
    var sound = $('setSound');
    var haptics = $('setHaptics');
    var speed = $('setSpeed');

    if (colorblind) settings.colorblind = colorblind.checked;
    if (reduced) settings.reducedMotion = reduced.checked;
    if (sound) settings.sound = sound.checked;
    if (haptics) settings.haptics = haptics.checked;
    if (speed) settings.speed = parseFloat(speed.value) || 1;

    Save.save();
    UI.applySettings();
  }

  function exportData() {
    var blob;
    try {
      blob = new Blob([JSON.stringify(Save.data, null, 2)], { type: 'application/json' });
    } catch (e) {
      UI.toast('Export is not supported in this browser.');
      return;
    }

    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'dutchkem-lagosrun-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    UI.toast('Your data export has downloaded.');
    Analytics.track('data_export', {});
  }

  function deleteData() {
    if (!window.confirm('Delete all local Lagos Run data on this device? This cannot be undone.')) return;

    Store.remove(CONFIG.storageKey);
    Store.remove(LEGACY_CONSENT_KEY);
    Save.data = Save.defaults();
    Save.save();

    Game.comebackUntil = 0;
    Game.rewardPending = false;
    Game.conductorMode = false;
    Game.hudSignature = '';
    UI.applySettings();
    UI.updateCurrency();
    UI.hideOverlay('settings');
    UI.toast('Local data deleted.');
    Analytics.track('data_delete', {});

    API.request('/api/user/me', { method: 'DELETE' });
  }

  function setOffline(isOffline) {
    var banner = $('offlineBanner');
    if (banner) banner.classList.toggle('active', !!isOffline);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(function (error) {
      console.warn('[LagosRun] Service worker registration failed:', error);
    });

    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'SW_UPDATED') {
        var banner = $('updateBanner');
        if (banner) banner.classList.add('active');
      }
    });

    navigator.serviceWorker.ready.then(function (registration) {
      if (registration.waiting && navigator.serviceWorker.controller) {
        var banner = $('updateBanner');
        if (banner) banner.classList.add('active');
      }
      registration.addEventListener('updatefound', function () {
        var installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            var el = $('updateBanner');
            if (el) el.classList.add('active');
          }
        });
      });
    }).catch(function () { /* ignore */ });
  }

  function bindReload() {
    bind('btnReload', 'click', function () {
      if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistration) {
        window.location.reload();
        return;
      }
      navigator.serviceWorker.getRegistration().then(function (registration) {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setTimeout(function () { window.location.reload(); }, 120);
      }).catch(function () {
        window.location.reload();
      });
    });
  }

  function bootstrap() {
    Save.load();
    UI.applySettings();
    UI.updateCurrency();
    Game.init();

    /* Splash → consent or menu */
    setTimeout(function () {
      var hasConsent = Save.data.consent && Save.data.consent.ts;
      UI.showScreen(hasConsent ? 'menu' : 'consent');

      var status = $('splashStatus');
      if (status) status.textContent = 'Ready';

      Game.refreshDaily();

      /* PWA shortcuts advertise ?mode=endless|hustle|crew — honour them. */
      if (hasConsent) {
        var requested = null;
        try {
          requested = new URLSearchParams(window.location.search).get('mode');
        } catch (e) {
          requested = null;
        }
        if (requested === 'endless' || requested === 'hustle' || requested === 'crew') {
          if (window.history && typeof window.history.replaceState === 'function') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          Game.start(requested);
        }
      }

      if (hasConsent && Save.loadedSeen) {
        var gap = now() - Save.loadedSeen;
        if (gap > 3 * 24 * 60 * 60 * 1000) {
          Save.data.comebackUntil = now() + 24 * 60 * 60 * 1000;
          Game.comebackUntil = Save.data.comebackUntil;
          Save.save();
          UI.toast('Welcome back! 2× earnings for 24h.', 3200);
          Analytics.track('comeback_bonus', { gapHours: Math.round(gap / 3600000) });
        }
      }
    }, 900);

    /* Consent */
    bind('consentAccept', 'click', function () {
      var analyticsEl = $('consentAnalytics');
      var adsEl = $('consentAds');
      var consent = {
        analytics: !!(analyticsEl && analyticsEl.checked),
        ads: !!(adsEl && adsEl.checked),
        ts: now()
      };
      Save.data.consent = consent;
      Save.save();
      Store.writeJSON(LEGACY_CONSENT_KEY, consent);

      UI.showScreen('menu');
      Game.refreshDaily();
      Audio.init();
      Audio.resume();
      Analytics.track('consent_accept', { analytics: consent.analytics, ads: consent.ads });
    });

    bind('consentReject', 'click', function () {
      var consent = { analytics: false, ads: false, ts: now() };
      Save.data.consent = consent;
      Save.save();
      Store.writeJSON(LEGACY_CONSENT_KEY, consent);

      UI.showScreen('menu');
      Game.refreshDaily();
    });

    /* Settings */
    bind('btnSettings', 'click', function () {
      syncSettingsInputs();
      UI.showOverlay('settings');
    });

    bind('setClose', 'click', function () {
      readSettingsInputs();
      UI.hideOverlay('settings');
    });

    bind('setExportData', 'click', exportData);
    bind('setDeleteData', 'click', deleteData);

    /* Mode cards */
    Array.prototype.forEach.call(document.querySelectorAll('.mode-card'), function (card) {
      card.addEventListener('click', function () {
        Audio.init();
        Audio.resume();
        Game.start(card.getAttribute('data-mode') || 'endless');
      });
    });

    /* Menu actions */
    bind('btnDaily', 'click', function () { Game.claimDaily(); });
    bind('btnShop', 'click', function () {
      UI.toast('Shop coming soon — Dutchkem Ventures Premium.');
    });
    bind('btnGarage', 'click', function () {
      UI.toast('Garage coming soon.');
    });
    bind('btnReportBug', 'click', function () {
      var subject = encodeURIComponent('Lagos Run Bug Report');
      var body = encodeURIComponent(
        'Describe the bug:\n\n\n---\nVersion: ' + CONFIG.version +
        '\nDevice: ' + (navigator.userAgent || 'unknown') +
        '\nScreen: ' + window.innerWidth + 'x' + window.innerHeight +
        '\nUID: ' + Save.data.uid
      );
      window.open('mailto:support@dutchkem.com?subject=' + subject + '&body=' + body, '_blank');
    });

    /* Service worker + connectivity */
    registerServiceWorker();
    bindReload();

    window.addEventListener('online', function () { setOffline(false); });
    window.addEventListener('offline', function () { setOffline(true); });
    setOffline(!navigator.onLine);

    /* Background sync on exit */
    window.addEventListener('beforeunload', function () {
      Analytics.flush();
      if (Save.data) {
        Save.data.lastSeen = now();
        Save.save();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && Game.running && !Game.paused) {
        Game.pause();
      }
    });

    Analytics.start();

    /* Non-blocking network warm-up */
    API.session().then(function (res) {
      var limit = res && (res.rewardedLimit || (res.data && res.data.rewardedLimit));
      if (limit) CONFIG.ads.maxRewardedPerDay = limit;
    });

    /* /api/config/remote answers { data, signature } — the payload lives under
     * data, not under a flattened config object.
     */
    API.remoteConfig().then(function (res) {
      var remote = (res && (res.data || res.config)) || null;
      if (remote && remote.ads && remote.ads.interstitialEveryRuns) {
        var every = parseInt(remote.ads.interstitialEveryRuns, 10);
        if (every > 0) CONFIG.ads.interstitialEveryRuns = every;
      }
      if (remote && remote.ads && remote.ads.rewardedPerDay) {
        var perDay = parseInt(remote.ads.rewardedPerDay, 10);
        if (perDay > 0) CONFIG.ads.maxRewardedPerDay = perDay;
      }
    });

    API.version().then(function (res) {
      if (res && (res.forceUpdate || (res.data && res.data.forceUpdate))) {
        var banner = $('updateBanner');
        if (banner) banner.classList.add('active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
