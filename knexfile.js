module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'db.yhnevhdrvsbdnhgseple.supabase.co',
      user: 'postgres',
      password: 'Omarionconor321*',
      database: 'postgres',
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations', // Directory where migration files will be stored
    },
  },
};
