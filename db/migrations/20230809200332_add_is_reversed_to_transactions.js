exports.up = function (knex) {
  return knex.schema.table("transactions", function (table) {
    table.boolean("is_reversed").defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.table("transactions", function (table) {
    table.dropColumn("is_reversed");
  });
};
