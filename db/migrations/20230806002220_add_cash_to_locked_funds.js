exports.up = async function (knex) {
  // Add 200 to the existing locked_balance, or set it to 200 if it doesn't exist
  await knex.raw(
    "UPDATE users SET locked_balance = COALESCE(locked_balance, 0) + 200"
  );
};

exports.down = async function (knex) {
  // Subtract 200 from the locked_balance (This might not be necessary for this use case)
  await knex.raw(
    "UPDATE users SET locked_balance = COALESCE(locked_balance, 0) - 200"
  );
};
