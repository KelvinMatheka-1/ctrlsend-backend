exports.up = function (knex) {
  return knex.schema.table("users", (table) => {
    table.decimal("immediate_balance").defaultTo(0);
    table.decimal("locked_balance").defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.table("users", (table) => {
    table.dropColumn("immediate_balance");
    table.dropColumn("locked_balance");
  });
};
