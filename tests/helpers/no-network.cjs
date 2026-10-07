'use strict';
// Unit suites must inject HTTP adapters. Fail before any accidental real fetch.
globalThis.fetch = async () => { throw new Error('REAL_NETWORK_FORBIDDEN_IN_TESTS: inject a mock'); };
