exports.up = function (knex) {
  return knex.schema.table("transactions", (table) => {
    table.dropColumn("sender_username");
  });
};

exports.down = function (knex) {
  return knex.schema.table("transactions", (table) => {
    table.string("sender_username").notNullable();
  });
};
