exports.up = function (knex) {
  return knex.schema.table("transactions", (table) => {
    table.string("sender_name").notNullable().defaultTo("Unknown");
  });
};

exports.down = function (knex) {
  return knex.schema.table("transactions", (table) => {
    table.dropColumn("sender_name");
  });
};
