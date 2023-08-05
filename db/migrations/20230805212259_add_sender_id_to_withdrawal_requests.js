// migrations/20230804120000_add_sender_id_to_withdrawal_requests.js (replace the timestamp with the current date and time)

exports.up = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.integer('sender_id').unsigned().references('users.id').onDelete('CASCADE');
  });
};

exports.down = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.dropColumn('sender_id');
  });
};
