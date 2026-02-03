// utils/mutex.js
// Simple in-memory mutex per key using promise queues.
// Not distributed — for single-process testing only (as requested).

const queues = new Map();

async function acquire(key) {
  if (!queues.has(key)) {
    queues.set(key, []);
    // immediate lock acquired
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const q = queues.get(key);
      if (!q || q.length === 0) {
        queues.delete(key);
      } else {
        // pop next resolver and call it
        const nextResolve = q.shift();
        nextResolve();
      }
    };
  } else {
    // create a promise and enqueue its resolver
    return await new Promise(resolve => {
      const q = queues.get(key);
      q.push(() => {
        // when this resolver is called, return unlock fn
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          const q2 = queues.get(key);
          if (!q2 || q2.length === 0) {
            queues.delete(key);
          } else {
            const nextResolve = q2.shift();
            nextResolve();
          }
        });
      });
    });
  }
}

module.exports = { acquire };
