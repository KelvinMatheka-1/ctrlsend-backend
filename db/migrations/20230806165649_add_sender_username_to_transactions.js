// ./migrations/20230806165649_add_sender_username_to_transactions.js
exports.up = function (knex) {
  return knex.schema.table("transactions", function (table) {
    table.string("sender_username")
  });
};

exports.down = function (knex) {
  return knex.schema.table("transactions", function (table) {
    table.dropColumn("sender_username");
  });
};
