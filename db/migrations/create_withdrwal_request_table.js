exports.up = function (knex) {
  return knex.schema.createTable('withdrawal_requests', function (table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.decimal('amount').notNullable();
    table.boolean('is_approved').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('withdrawal_requests');
};
