exports.up = function (knex) {
  return knex.schema.createTable('transactions', function (table) {
    table.increments('id').primary();
    
    table.integer('sender_id').notNullable();
    table.integer('recipient_id').notNullable();
    table.decimal('amount').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('transactions');
};
