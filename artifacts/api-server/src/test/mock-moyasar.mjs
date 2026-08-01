/**
 * Configurable mock for the Moyasar client used by payment gate tests.
 *
 * Tests call setMoyasarResult() before exercising the route.
 * The mock moyasarFetch returns the queued result (or throws if queue is empty).
 */

const _queue = [];

/** Push the next result the upcoming moyasarFetch call should return. */
export function setMoyasarResult(result) {
  _queue.push({ kind: "ok", value: result });
}

/** Push a rejection so the next moyasarFetch call throws. */
export function setMoyasarError(message) {
  _queue.push({ kind: "err", message });
}

/** Reset between tests. */
export function resetMoyasar() {
  _queue.length = 0;
}

export async function moyasarFetch(_method, _path, _body) {
  const next = _queue.shift();
  if (!next) throw new Error("moyasarFetch called but queue is empty");
  if (next.kind === "err") throw new Error(next.message);
  return next.value;
}
