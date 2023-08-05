// ./migrations/timestamp_add_is_pending_to_transactions.js

exports.up = function(knex) {
  return knex.schema.alterTable('transactions', function(table) {
    table.boolean('is_pending').notNullable().defaultTo(true);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('transactions', function(table) {
    table.dropColumn('is_pending');
  });
};
