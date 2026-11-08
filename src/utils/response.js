/** Success envelope: { ok: true, data } */
function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

/** Error envelope: { ok: false, error: { code, message } } */
function fail(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}

module.exports = { ok, fail };
