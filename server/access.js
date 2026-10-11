// server/access.js
// Sharing/permission rules, server.js se alag taake test ho sakein.

function isOwner(doc, userId) {
  return !!doc && doc.owner === userId;
}

function canAccess(doc, userId) {
  if (!doc || !userId) return false;
  return isOwner(doc, userId) || (doc.sharedWith || []).includes(userId);
}

// Share karne se pehle check: { ok: true } ya { ok: false, status, error }
function checkShare(doc, requesterId, targetId, validUserIds) {
  if (!canAccess(doc, requesterId)) {
    return { ok: false, status: 404, error: "Document not found" };
  }
  if (!isOwner(doc, requesterId)) {
    return { ok: false, status: 403, error: "Only the owner can share this document" };
  }
  if (!targetId || !validUserIds.includes(targetId)) {
    return { ok: false, status: 400, error: "Unknown user" };
  }
  if (targetId === doc.owner) {
    return { ok: false, status: 400, error: "Owner already has access" };
  }
  if ((doc.sharedWith || []).includes(targetId)) {
    return { ok: false, status: 409, error: "Already shared with this user" };
  }
  return { ok: true };
}

module.exports = { isOwner, canAccess, checkShare };