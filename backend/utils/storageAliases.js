const { uploadToVPS } = require("../helpers/uploadToVPS");
const deleteFromVPS = require("../helpers/deleteFromVPS");

// Kept under the old "Firebase" names since the rest of the codebase
// (routes, forms) still calls them this way after the VPS migration.
const deleteFromFirebase = deleteFromVPS;
const uploadToFirebase = (file, folder) => uploadToVPS(file, folder);

module.exports = { uploadToFirebase, deleteFromFirebase };
