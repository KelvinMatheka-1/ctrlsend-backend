module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'ctrlsend.cfv8oi2zcuah.eu-north-1.rds.amazonaws.com',
      user: 'postgres',
      password: 'Omarionconor2',
      database: 'ctrlsend',
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations', // Directory where migration files will be stored
    },
  },
};
