exports.up = function (knex) {
  return knex("users").update({ immediate_balance: knex.raw("immediate_balance + 300") });
};

exports.down = function (knex) {
  // No need to implement the down function as this is a one-time update.
};
