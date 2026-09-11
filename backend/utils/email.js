const dns = require("dns").promises;

const isEmailDomainValid = async (email) => {
  try {
    if (!email || !email.includes("@")) return false;
    const domain = email.split("@")[1];
    if (!domain) return false;
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
};

module.exports = isEmailDomainValid;
