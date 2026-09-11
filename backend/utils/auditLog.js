const AuditLog = require("../models/AuditLog");

const logAction = (adminEmail, action, entity, entityName = "", details = {}) => {
  AuditLog.create({ adminEmail, action, entity, entityName, details }).catch(
    (err) => console.log("Audit log failed:", err.message)
  );
};

module.exports = logAction;
