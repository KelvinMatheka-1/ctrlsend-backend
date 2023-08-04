exports.up = function(knex) {
  return knex.schema.table('withdrawal_requests', function(table) {
    table.string('status').defaultTo('pending');
  });
};

exports.down = function(knex) {
  return knex.schema.table('withdrawal_requests', function(table) {
    table.dropColumn('status');
  });
};
