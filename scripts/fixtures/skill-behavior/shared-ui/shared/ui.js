function textField({ name, label, value }) {
  return Object.freeze({ kind: "text-field", name, label, value, className: "admin-input" });
}
function saveAction({ label, onSave }) {
  return Object.freeze({ kind: "save-action", label, className: "admin-primary", press: onSave });
}
function formPage({ title, fields, action }) {
  return Object.freeze({ kind: "page", title, layout: "admin-form", fields: Object.freeze(fields), action });
}
module.exports = { formPage, textField, saveAction };
