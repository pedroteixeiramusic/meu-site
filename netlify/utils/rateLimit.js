const store = {};

function rateLimit(ip, limit = 150, windowMs = 60000) {
  const now = Date.now();

  if (!store[ip]) {
    store[ip] = [];
  }

  store[ip] = store[ip].filter(ts => now - ts < windowMs);

  if (store[ip].length >= limit) {
    return false;
  }

  store[ip].push(now);
  return true;
}

module.exports = rateLimit;
