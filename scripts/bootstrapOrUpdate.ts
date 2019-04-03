import "dotenv/config"

import { databaseURL } from "../src/config/database"

import { extend } from "lodash"
import { MongoClient } from "mongodb"
import { convertCSVToJSON } from "../src/utils/convertCSVToJSON"
import { getPriceGuidance } from "../src/utils/getPriceGuidance"

const csvFile = process.argv[2]

/**
 * This script allows us to bootstrap or update a database on the configured MongoDB database
 * with collections data. It will then update the collection MongoDB objects with the data in a specified JSON file
 *
 * @usage yarn update-database ./fixtures/collections.csv
 */
export async function bootstrapOrUpdate(path: string) {
  const data = await convertCSVToJSON(path)
  const connection = await MongoClient.connect(databaseURL!)
  const database = connection.db()
  const collection = database.collection("collection")

  try {
    if (connection.isConnected) {
      for (const entry of data) {
        if (!entry.price_guidance) {
          const priceGuidance = await getPriceGuidance(entry.slug)
          extend(entry, { price_guidance: priceGuidance })
        }
        await collection.update({ slug: entry.slug }, entry, { upsert: true })
        console.log("Successfully updated: ", entry.slug, entry.title)
      }

      console.log("Successfully updated collections database")
      connection.close()
    }
    process.exit(0)
  } catch (error) {
    console.error("[kaws] Error bootstrapping data:", error)
    process.exit(1)
  } finally {
    /* tslint:disable:no-unused-expression */
    connection && connection.close()
    /* tslint:enable:no-unused-expression */
  }
}

bootstrapOrUpdate(csvFile)
