import { MongoClient } from "mongodb";

export default async function initMongo() {
    const mongoClient = new MongoClient(process.env.URL_MONGO);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.DB_MONGO)
    return { mongoClient, db }
}