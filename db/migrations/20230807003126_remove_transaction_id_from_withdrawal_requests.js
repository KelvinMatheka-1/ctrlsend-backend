// migrations/20230809000000_remove_transaction_id_from_withdrawal_requests.js (replace the timestamp with the current date and time)

exports.up = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.dropColumn('transaction_id');
  });
};

exports.down = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.integer('transaction_id').unsigned().references('transactions.id').onDelete('CASCADE');
  });
};
