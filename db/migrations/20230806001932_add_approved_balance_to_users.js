exports.up = function (knex) {
  return knex.schema.table("users", (table) => {
    table.decimal("approved_balance").defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.table("users", (table) => {
    table.dropColumn("approved_balance");
  });
};
