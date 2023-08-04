module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'kelvin',
      password: 'Omarionconor2',
      database: 'ctrlsend',
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations', // Directory where migration files will be stored
    },
  },
};
