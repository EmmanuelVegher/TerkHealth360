const crypto = require('crypto');
if (!crypto.getRandomValues && crypto.webcrypto && crypto.webcrypto.getRandomValues) {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}
