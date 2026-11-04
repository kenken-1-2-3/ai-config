const { formPage, textField, saveAction } = require("../shared/ui.js");
module.exports = function memberPage({ displayName, save }) {
  return formPage({
    title: "Create member",
    fields: [textField({ name: "displayName", label: "Display name", value: displayName })],
    action: saveAction({ label: "Save member", onSave: () => save({ displayName }) }),
  });
};
