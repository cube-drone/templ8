const express = require('express')
require('express-async-errors'); // this patches better async error handling into express
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const assert = require('assert')

const { Redis } = require("ioredis")

const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const nodeEnv = process.env.NODE_ENV || "development";
const envPort = process.env.TEMPL8_PORT || 9393;
const cookieSecret = process.env.TEMPL8_SECRET || "toots ahoy";
const redisUrl = process.env.TEMPL8_REDIS_URL || process.env.REDIS_URL || 
    "redis://localhost:6379";
const postgresConnectionString = process.env.TEMPL8_POSTGRES_URL || process.env.POSTGRES_URL || 
    "postgres://postgres:example@localhost:15432/authome";

//--------------------------
async function main(){
    app.use(cookieParser(cookieSecret))

    // we are going to deploy this behind nginx
    app.set('trust proxy', true)
    // log stuff
    app.use(morgan('tiny'))

    const sqlDatabase = require('knex')({
        client: 'pg',
        connection: postgresConnectionString
    });  
    const redis = new Redis(redisUrl);

    let noopMiddleware = async (req, res, next) => {
        next()
    }

    // error handler
    app.use((err, req, res, next) => {
        console.error(err.stack)
        let errorMessage = err.message;
        if(nodeEnv === "production"){
            errorMessage = "Internal Server Error"
        }
        res.status(500).send(errorMessage)
    })

    //---------------------------

    app.get('/ping', function (req, res) {
        res.send('pong')
    })

    app.get('/test', async function (req, res) {
        await redis.set("ponk", "toots ahoy", "EX", 60*60*24*7)
        let pong = await redis.get("ponk")
        assert.strictEqual(pong, "toots ahoy")

        res.send(":)")
    })

    app.listen(envPort)
    console.log(`Listening on port ${envPort}...`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})