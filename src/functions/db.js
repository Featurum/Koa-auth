import pg from 'pg-promise'
import env from 'dotenv'

/* Конфигурация */
env.config()

const pgp = pg({
    // Initialization Options
});

const cn = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
}

export default pgp(cn)
