exports.up = function (knex) {
  return knex.schema.table("users", (table) => {
    table.dropColumn("balance");
  });
};

exports.down = function (knex) {
  return knex.schema.table("users", (table) => {
    table.decimal("balance").defaultTo(0);
  });
};
