// const {Client} = require('pg')

// const client = new Client({
//   host: 'localhost',
//   user: 'kelvin',
//   port: 5432,
//   pasword: "Omarionconor2",
//   database: "postgres"
// })

// client.connect();

// client.query(`Select * from users`, (res, err) => {
//   if(!err){
//     console.log(res.rows);
//   }else{
//     console.log(err.message);
//   }
//   client.end;
// })