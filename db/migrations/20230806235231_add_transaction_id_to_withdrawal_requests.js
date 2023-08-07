exports.up = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.integer('transaction_id').unsigned().references('transactions.id').onDelete('CASCADE');
  });
};

exports.down = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.dropColumn('transaction_id');
  });
};
