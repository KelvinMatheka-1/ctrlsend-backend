exports.up = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.dropColumn('sender_id');
  });
};

exports.down = function (knex) {
  return knex.schema.table('withdrawal_requests', (table) => {
    table.integer('sender_id').unsigned().references('users.id').onDelete('CASCADE');
  });
};
