exports.up = function (knex) {
  return knex.raw('UPDATE "transactions" SET "sender_name" = (SELECT "username" FROM "users" WHERE "users"."id" = "transactions"."sender_id")');
};

exports.down = function (knex) {
  // This is a data migration, and reversing it is not necessary for the database schema
  // If you need to revert this, you may need to create another migration to backup the data before the update.
  return Promise.resolve();
};
